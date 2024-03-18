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

import {
  EmbedContentRequest,
  TaskType,
  GoogleGenerativeAI,
} from '@google/generative-ai';
import config from '../config';

let client: GoogleGenerativeAI;

const initializeGeminiClient = async () => {
  const t0 = performance.now();

  client = new GoogleGenerativeAI(config.googleAIKey);

  const duration = performance.now() - t0;

  console.log(`Initialized client. This took ${duration}ms`);
};

/**
 * Generates embeddings a given array of sentences using Gemini embedding model.
 *
 * @param text a string or array of strings to be embedded.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 768 numbers representing the embedding of the text.
 */
async function getEmbeddingsGemini(
  text: string | string[]
): Promise<number[][]> {
  if (!client && (typeof text !== 'string' || text.length !== 0)) {
    await initializeGeminiClient();
  }

  const model = client.getGenerativeModel({model: 'embedding-001'});

  let embeddings: number[][] = [];

  const t0 = performance.now();

  if (Array.isArray(text)) {
    const batches: EmbedContentRequest[] = text.map(doc => ({
      content: {role: 'user', parts: [{text: doc}]},
      taskType: TaskType.RETRIEVAL_QUERY,
    }));

    const result = await model.batchEmbedContents({
      requests: batches,
    });

    embeddings = result.embeddings.map(embedding => embedding.values);
  } else {
    const result = await model.embedContent(text);
    embeddings = [result.embedding.values];
  }

  const duration = performance.now() - t0;
  console.log(`Processed embeddings. This took ${duration}ms`);

  return embeddings;
}

export default getEmbeddingsGemini;
