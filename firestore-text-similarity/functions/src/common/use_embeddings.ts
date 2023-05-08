require('@tensorflow/tfjs-node');
const use = require('@tensorflow-models/universal-sentence-encoder');

let model: any;

/**
 * Generates embeddings for a given array of sentences using Universal Sentence Encoder model.
 *
 * @param text a string or array of strings to be embedded.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 512 numbers representing the embedding of the text.
 */
async function getEmbeddingsUSE(text: string | string[]): Promise<number[][]> {
  if (!model && (typeof text !== 'string' || text.length !== 0)) {
    model = await use.load();
  }

  const embeddings = await model.embed(text.length ? text : [text]);

  return embeddings.arraySync();
}

export default getEmbeddingsUSE;
