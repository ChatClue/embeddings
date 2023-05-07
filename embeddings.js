const cheerio = require("cheerio");
const https = require("https");
const wordCount = require("word-count");

class Embeddings {
  constructor(apiKey, embeddingModel = "text-embedding-ada-002", completionModel = "text-davinci-003", completionModelOptions = { max_tokens: 2000, n: 1, stop: null, temperature: 0.7 }) {
    this.apiKey = apiKey;
    this.embeddingModel = embeddingModel;
    this.completionModel = completionModel;
    this.completionModelOptions = completionModelOptions;
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
    const $ = cheerio.load(html);
    $("script, style").remove();
    return $.text();
  }

  async processText(text) {
    const maxTokens = 2000;
    const textChunks = this.splitTextIntoChunks(text, maxTokens);
  
    let allQaPairs = [];
  
    for (const chunk of textChunks) {
      const prompt = `Process the following text into a list of question-answer pairs in JSON format:\n\n${chunk}\n\nQuestion-answer pairs:`;
      const completion = await this.openaiCall(prompt, "/v1/completions", null);
      const qaPairs = JSON.parse(completion.trim());
      allQaPairs = allQaPairs.concat(qaPairs);
    }
  
    return allQaPairs;
  }
  
  splitTextIntoChunks(text, maxTokens) {
    const words = text.split(/\s+/);
    const chunks = [];
  
    let currentChunkWords = [];
    let currentWordCount = 0;
  
    for (const word of words) {
      const wordLength = wordCount(word);
  
      if (currentWordCount + wordLength > maxTokens) {
        chunks.push(currentChunkWords.join(" "));
        currentChunkWords = [];
        currentWordCount = 0;
      }
  
      currentChunkWords.push(word);
      currentWordCount += wordLength;
    }
  
    if (currentChunkWords.length > 0) {
      chunks.push(currentChunkWords.join(" "));
    }
  
    return chunks;
  }

  async generateEmbeddings(qaPairs) {
    const generateEmbeddingForText = async (text) => {
      try {
        const embedding = await this.openaiCall(text, "/v1/embeddings", "text-embedding-ada-002");
        return embedding;
      } catch (error) {
        console.error("Error generating embedding:", error);
        return null;
      }
    };

    // Generate embeddings for all questions
    const embeddings = [];
    for (const qaPair of qaPairs) {
      const question = qaPair.question;
      const embedding = await generateEmbeddingForText(question);
      if (embedding) {
        embeddings.push({
          question,
          answer: qaPair.answer,
          embedding,
        });
      }
    }

    return embeddings;
  }

  async generate(text) {
    const extractedText = this.extractText(text);
    const qaPairs = await this.processText(extractedText);
    const embeddingsResult = await this.generateEmbeddings(qaPairs);
    return embeddingsResult;
  }
}

module.exports = Embeddings;
