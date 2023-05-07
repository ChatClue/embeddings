# Embeddings NPM Package

The `embeddings` package is a utility for generating question-answer pairs and embeddings from HTML pages or text input. It utilizes the OpenAI API to generate question-answer pairs and embeddings. This package is useful for generating training data for chatbots or question-answering models.

## Constructor Options

The `Embeddings` class can be instantiated with the following options:

- `apiKey` (required): Your OpenAI API key.
- `embeddingModel` (optional, default: "text-embedding-ada-002"): The name of the OpenAI model to use for generating embeddings.
- `completionModel` (optional, default: "text-davinci-003"): The name of the OpenAI model to use for generating question-answer pairs.
- `completionModelOptions` (optional, default: `{ max_tokens: 2000, n: 1, stop: null, temperature: 0.7 }`): The options to pass to the completion model when generating question-answer pairs.
- `screenshotApiKey` (optional): Your Pagepixels Screenshot API key (https://pagepixels.com), used for scraping HTML from webpages.
- `screenshotOptions` (optional, default: `{}`): The options to pass to the Pagepixels Screenshot API when scraping HTML.
- `chunkMaxTokens` (optional, default: 800): The maximum number of tokens to send to the OpenAI API at once.
- `promptRefinement` (optional, default: ""): Any prompt refinement you would like to add to the completion prompt.
- `verbose` (optional, default: false): Whether or not to output additional logging information during processing.

## Usage

The `Embeddings` class provides several methods for generating embeddings and question-answer pairs. These methods can be used standalone or in combination to generate embeddings and question-answer pairs from HTML pages or text input.

### `processText`

The `processText` method takes a string of text and generates question-answer pairs from it using the OpenAI API. It splits the text into smaller chunks and sends each chunk to the API separately, to avoid hitting the API's maximum request size limit. The method returns an array of question-answer pairs.

```javascript
const embeddings = require('embeddings');

const options = {
  apiKey: 'your_api_key',
  verbose: true
}

const embeddingsClient = new embeddings(options);

const text = `Welcome to our documentation. This guide will walk you through the basics of using our platform.`;

const qaPairs = await embeddingsClient.processText(text);

console.log(qaPairs);
```

### `generateEmbeddings`

The `generateEmbeddings` method takes an array of question-answer pairs and generates embeddings for the questions using the OpenAI API. The method returns an array of objects, each containing the original question-answer pair along with the corresponding embedding.

```javascript
const embeddings = require('embeddings');

const options = {
  apiKey: 'your_api_key',
  verbose: true
}

const embeddingsClient = new embeddings(options);

const qaPairs = [
  { question: 'What does this package do?', answer: 'This package generates question-answer pairs and embeddings from HTML pages or text input.' },
  { question: 'What is the purpose of this package?', answer: 'The purpose of this package is to generate training data for chatbots or question-answering models.' },
];

const embeddingsResult = await embeddingsClient.generateEmbeddings(qaPairs);

console.log(embeddingsResult);
```

### `generateFromText`

The `generateFromText` method takes a string of text and generates embeddings and question-answer pairs from it. The method returns an array of objects, each containing the original question-answer pair along with the corresponding embedding.

```javascript
const embeddings = require('embeddings');

const options = {
  apiKey: 'your_api_key',
  verbose: true
}

const embeddingsClient = new embeddings(options);

const text = `Welcome to our documentation. This guide will walk you through the basics of using our platform.`;

const embeddingsResult = await embeddingsClient.generateFromText(text);

console.log(embeddingsResult);
```

### `generateFromUrls`

The `generateFromUrls` method takes an array of URLs and generates embeddings and question-answer pairs from the text content of the pages at those URLs. The method takes screenshots of the web pages using the Pagepixels API and extracts the text content from the resulting HTML. The method returns an array of objects, each containing the original question-answer pair along with the corresponding embedding and the URL of the page from which it was generated.

```javascript
const embeddings = require('embeddings');

const options = {
  apiKey: 'your_api_key',
  screenshotApiKey: 'your_screenshot_api_key',
  verbose: true
}

const embeddingsClient = new embeddings(options);

const urls = ['https://www.example.com', 'https://www.example.com/about'];

const embeddingsResult = await embeddingsClient.generateFromUrls(urls);

console.log(embeddingsResult);
```

## Conclusion

The `embeddings` package provides a convenient way to generate question-answer pairs and embeddings from HTML pages or text input using the OpenAI API. By using the methods provided by the package, it is easy to generate training data for chatbots or question-answering models. The available constructor options provide flexibility for customizing the behavior of the package.