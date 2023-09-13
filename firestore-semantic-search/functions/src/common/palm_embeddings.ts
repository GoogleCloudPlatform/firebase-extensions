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

import {helpers, v1} from '@google-cloud/aiplatform';
import config from '../config';

let client: v1.PredictionServiceClient;

const endpoint = `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${config.palmModel}`;

const initializePaLMClient = async () => {
  const t0 = performance.now();

  // here location is hard-coded, following https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings#generative-ai-get-text-embedding-nodejs
  const clientOptions = {
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
  };

  client = new v1.PredictionServiceClient(clientOptions);

  const duration = performance.now() - t0;

  console.log(`Initialized client. This took ${duration}ms`);
};

/**
 * Generates embeddings for single batch of sentences using PaLM embedding model.
 *
 * @param text a string or array of strings to be embedded.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 512 numbers representing the embedding of the text.
 */
async function embedBatchPaLM(batch: string[]): Promise<number[][]> {
  const instances = batch.map(text =>
    helpers.toValue({content: text})
  ) as protobuf.common.IValue[];

  const parameters = helpers.toValue({});

  const [response] = await client.predict({
    endpoint,
    instances,
    parameters,
  });

  if (!response || !response.predictions || response.predictions.length === 0)
    throw new Error('Error with embedding');

  const predictionValues = response.predictions as protobuf.common.IValue[];

  const predictions = predictionValues.map(helpers.fromValue) as {
    embeddings: {values: number[]};
  }[];

  if (
    predictions.some(
      prediction => !prediction.embeddings || !prediction.embeddings.values
    )
  ) {
    throw new Error('Error with embedding');
  }

  const embeddings = predictions.map(
    prediction => prediction.embeddings.values
  );

  return embeddings;
}

/**
 * Batches and embeddings for a given array of sentences using PaLM embedding model.
 *
 * @param text a string or array of strings to be embedded.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 512 numbers representing the embedding of the text.
 */
async function getEmbeddingsPaLM(text: string | string[]): Promise<number[][]> {
  if (!client && (typeof text !== 'string' || text.length !== 0)) {
    await initializePaLMClient();
  }

  if (typeof text === 'string') text = [text];

  // chunk into batches of 5 (the current limit of the PaLM API)
  const batchSize = 5;
  const batches = [];
  for (let i = 0; i < text.length; i += batchSize) {
    batches.push(text.slice(i, i + batchSize));
  }

  const t0 = performance.now();
  const embeddingBatches = await Promise.all(
    batches.map(async batch => {
      return embedBatchPaLM(batch);
    })
  );
  const embeddings = embeddingBatches.flat();

  const duration = performance.now() - t0;
  console.log(`Processed embeddings. This took ${duration}ms`);
  // const embeddings = await client.embedText(text.length ? text : [text]);

  return embeddings;
}

export default getEmbeddingsPaLM;
