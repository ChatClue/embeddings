README.md:

# embeddings

`embeddings` is an NPM package that structures ambiguous data into discrete question-answer pairs and generates associated embeddings for similarity querying via Faiss or similar.

## Installation

```bash
npm install embeddings
```

## Usage

```javascript
const Embeddings = require('embeddings');

const apiKey = 'YOUR_OPENAI_API_KEY';
const embeddings = new Embeddings(apiKey);

const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed nec sapien ac mi semper facilisis quis nec urna. Vivamus quis nisl in metus gravida commodo eu at magna. Phasellus id diam augue.';

const embeddingsResult = await embeddings.generate(text);
console.log(embeddingsResult);
```

The `generate` method accepts a string of text as input and returns an array of objects, each representing a question-answer pair and its associated embedding. The format of each object is as follows:

```javascript
{
  question: 'What is Lorem ipsum?',
  answer: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  embedding: [0.3, -0.1, 0.5, ...] // Array of numerical values representing the embedding
}
```

## Configuration

The `Embeddings` constructor takes three optional parameters:

- `embeddingModel`: The name of the OpenAI embedding model to use (default: `'text-embedding-ada-002'`).
- `completionModel`: The name of the OpenAI completion model to use (default: `'text-davinci-003'`).
- `completionModelOptions`: Additional options to pass to the completion model (default: `{ max_tokens: 2000, n: 1, stop: null, temperature: 0.7 }`).

## License

This package is licensed under the MIT license. See the [LICENSE](LICENSE) file for more details.