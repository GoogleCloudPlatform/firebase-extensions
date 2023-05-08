/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
