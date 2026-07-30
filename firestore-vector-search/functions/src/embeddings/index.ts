/**
 * Copyright 2026 Google LLC
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

import {config} from '../config';
import {
  FirestoreOnWriteProcess,
  FirestoreOnWriteProcessor,
} from '@invertase/firebase-extension-utilities';
import {DocumentData, FieldValue} from '@google-cloud/firestore';
import {embeddingClient} from './client';
import * as functions from 'firebase-functions/v1';

const embed = async input => {
  await embeddingClient.initialize();
  const text = input[config.inputField];

  let embedding: number[];
  try {
    embedding = await embeddingClient.getSingleEmbedding(text);
  } catch (e) {
    console.error('Error fetching embeddings:', e);
    throw new Error('Error with embedding');
  }

  return {[config.outputField]: FieldValue.vector(embedding)};
};

const batchEmbedFn = async (docs: DocumentData[]) => {
  await embeddingClient.initialize();
  const embeddings = await embeddingClient.getEmbeddings(
    docs.map(doc => doc[config.inputField] as string)
  );
  if (config.vectorStoreProvider === 'firestore') {
    return embeddings.map(embedding => ({
      [config.outputField]: FieldValue.vector(embedding),
    }));
  } else {
    return embeddings.map(embedding => ({
      [config.outputField]: JSON.stringify(embedding),
    }));
  }
};

const shouldBackfill = data => {
  const hasValidInput =
    data[config.inputField] && typeof data[config.inputField] === 'string';

  return hasValidInput;
};

export const embedProcess = new FirestoreOnWriteProcess(embed, {
  id: config.instanceId,
  fieldDependencyArray: [config.inputField],
  shouldProcess: (_oldData, newData) =>
    !!newData[config.inputField] &&
    typeof newData[config.inputField] === 'string',
  shouldBackfill,
  batchFn: batchEmbedFn,
  batchSize: embeddingClient.batchSize,
});

const shouldUpdate = (data: Record<string, any>) => {
  const hasValidInput =
    data[config.inputField] && typeof data[config.inputField] === 'string';

  const hasExistingOutput = data[config.outputField];

  return hasValidInput && hasExistingOutput;
};

export const updateEmbedProcess = new FirestoreOnWriteProcess(embed, {
  id: config.instanceId,
  fieldDependencyArray: [config.inputField],
  shouldBackfill: shouldUpdate,
});

const embedOnWriteProcessor = new FirestoreOnWriteProcessor({
  processes: [embedProcess],
  statusField: config.statusField,
});

export const handleEmbedOnWrite = (
  change: functions.Change<functions.firestore.DocumentSnapshot>
) => {
  return embedOnWriteProcessor.run(change);
};
