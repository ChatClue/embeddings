const cheerio = require("cheerio");
const https = require("https");
const GPTEncoder = require('gpt-3-encoder')
const ScreenshotsPagepixels = require("screenshots-pagepixels");

class Embeddings {
  constructor(options) {
    this.apiKey = options.apiKey;
    this.embeddingModel = options.embeddingModel || "text-embedding-ada-002";
    this.completionModel = options.completionModel || "text-davinci-003";
    this.completionModelOptions = options.completionModelOptions || { max_tokens: 2000, n: 1, stop: null, temperature: 0.7 };
    this.screenshotApiKey = options.screenshotApiKey;
    this.screenshotOptions = options.screenshotOptions || {};
    this.chunkMaxTokens = options.chunkMaxTokens || 800;
    this.promptRefinement = options.promptRefinement || "";
    this.verbose = options.verbose || false;
  }

  async openaiCall(prompt, url, model = null) {
    const postData = model === this.embeddingModel
      ? JSON.stringify({
          input: prompt,
          model: this.embeddingModel,
        })
      : JSON.stringify({
          prompt,
          model: this.completionModel,
          ...this.completionModelOptions,
        });
  
    const options = {
      hostname: "api.openai.com",
      path: url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        Authorization: `Bearer ${this.apiKey}`,
      },
    };
  
    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.setEncoding("utf8");
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const response = JSON.parse(responseBody);
  
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(model ? response.data[0].embedding : response.choices[0].text);
          } else {
            const error = new Error(response.message || "OpenAI API error");
            error.statusCode = res.statusCode;
            error.response = response;
            reject(error);
          }
        });
      });
  
      req.on("error", (error) => {
        console.error("Error calling OpenAI API:", error);
        reject(error);
      });
  
      req.write(postData);
      req.end();
    });
  }  

  extractText(html) {
    if(this.verbose){ console.log("extracting text"); }
    const $ = cheerio.load(html);
    $("script, style, link").remove(); // remove script, style, and link tags
    const text = $('body').text().replace(/\s+/g, ' ').trim(); // extract text only from body element
    if(this.verbose){ console.log(text); }
    return text;
  }

  async generateQaPairsFromText(text, url=undefined) {
    const maxTokens = this.chunkMaxTokens;
    const textChunks = this.splitTextIntoChunks(text, maxTokens);

    let allQaPairs = [];

    for (const chunk of textChunks) {
      if(this.verbose){ console.log("Calling OpenAI to process chunk"); }
      if(this.verbose) console.log("Chunk: ", chunk)
      const prompt = `Process the following text into a list of question-answer pairs associated with the relevant content on the page, like: [{"question": "this is the question", "answer": "this is the answer"}]. ${this.promptRefinement}. Return only valid JSON in your response:\n\n${chunk}\n\nQuestion-answer pairs valid JSON:`;
      const completion = await this.openaiCall(prompt, "/v1/completions", null);
      if(this.verbose){ console.log("Processing Text"); }
      // Escape double quotes only within code examples
      const escapedCompletion = completion.trim().replace(/(```[\s\S]*?```)/g, (match) => {
        return match.replace(/(?<=^```[^`]*)(?<!\\)"/gm, '\\"');
      });
      if(this.verbose){ console.log("Escaped Completion: ", escapedCompletion); }

      // Parse the escaped JSON string
      try{
        let qaPairs = JSON.parse(escapedCompletion);
        
        // Add the URL key to each qaPair
        if(url){
          qaPairs = qaPairs.map(qaPair => ({ ...qaPair, url }));
        }
        if(this.verbose){ console.log(qaPairs); }
        allQaPairs = allQaPairs.concat(qaPairs);
      } catch (error) {
        console.error("Error parsing JSON returned by OpenAI:", error);
      }
    }

    return allQaPairs;
  }
  
  
  splitTextIntoChunks(text, maxTokens) {
    const tokens = GPTEncoder.encode(text)
    const chunks = [];
  
    let currentChunkTokens = [];
    let currentTokenCount = 0;
  
    for (const token of tokens) {  
      if (currentTokenCount + 1 > maxTokens) {
        chunks.push(currentChunkTokens.join(""));
        currentChunkTokens = [];
        currentTokenCount = 0;
      }
  
      currentChunkTokens.push(GPTEncoder.decode([token]));
      currentTokenCount += 1;
    }
  
    if (currentChunkTokens.length > 0) {
      chunks.push(currentChunkTokens.join(""));
    }
  
    return chunks;
  }

  async generateEmbeddingForText(text) {
    try {
      const embedding = await this.openaiCall(text, "/v1/embeddings", this.embeddingModel);
      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      return null;
    }
  }

  async generateQaEmbeddingsFromQaPairs(qaPairs) {
    if(this.verbose){ console.log("Generating Embeddings"); }

    // Generate embeddings for all questions
    const embeddings = [];
    for (const qaPair of qaPairs) {
      const question = qaPair.question;
      const embedding = await this.generateEmbeddingForText(question);
      if (embedding) {
        embeddings.push({
          question,
          answer: qaPair.answer,
          url: qaPair.url,
          embedding,
        });
      }
    }

    return embeddings;
  }

  async generateQaEmbeddingsFromText(text) {
    const extractedText = this.extractText(text);
    const qaPairs = await this.generateQaPairsFromText(extractedText);
    const embeddingsResult = await this.generateQaEmbeddingsFromQaPairs(qaPairs);
    return embeddingsResult;
  }

  async generateQaEmbeddingsFromUrls(urls) {
    const pagepixels = new ScreenshotsPagepixels(this.screenshotApiKey);
    const htmlPromises = urls.map(async (url) => {
      if(this.verbose) console.log("processing", url);
      const options = { url, html_only: true, ...this.screenshotOptions };
      const html = await pagepixels.snap(options);
      return JSON.parse(html).html;
    });

    const htmlResults = await Promise.all(htmlPromises);
    const textResults = htmlResults.map((html) => this.extractText(html));
    const qaPairsResults = await Promise.all(textResults.map((text, index) => this.generateQaPairsFromText(text, urls[index])));
    const embeddingsResults = await Promise.all(qaPairsResults.map((qaPairs) => this.generateQaEmbeddingsFromQaPairs(qaPairs)));

    const flatEmbeddingsResults = [].concat(...embeddingsResults);
    return flatEmbeddingsResults;
  }

}

module.exports = Embeddings;
