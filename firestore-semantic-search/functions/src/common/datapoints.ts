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

import * as admin from 'firebase-admin';
import {FormattedDatapoint} from '../types/formatted_datapoint';
import config from '../config';
import getEmbeddingsPaLM from './palm_embeddings';
import getEmbeddingsUSE from './use_embeddings';
import getEmbeddingsGemini from './gemini_embeddings';

export const getEmbeddings =
  config.embeddingMethod === 'gemini'
    ? getEmbeddingsGemini
    : config.embeddingMethod === 'palm'
    ? getEmbeddingsPaLM
    : getEmbeddingsUSE;

export async function getDatapoint(
  reference: admin.firestore.DocumentReference,
  data: admin.firestore.DocumentData
): Promise<FormattedDatapoint | undefined> {
  if (Object.keys(data).length === 0) return;

  const mapped = mapAndFilterData(data);

  if (mapped.length === 0) return;

  const stringToEmbed = mapped.join(', ');

  const embeddings = await getEmbeddings(stringToEmbed);
  return {
    id: reference.id,
    embedding: embeddings[0],
  };
}

export async function getDatapointsList(
  dataList: {id: string; data: any}[]
): Promise<FormattedDatapoint[]> {
  const mappedData: string[] = [];

  for (const {data} of dataList) {
    if (Object.keys(data).length === 0) continue;

    const mapped = mapAndFilterData(data);

    if (mapped.length === 0) continue;

    mappedData.push(mapped.join(', '));
  }

  if (mappedData.length === 0) return [];

  const embeddings = await getEmbeddings(mappedData);

  return embeddings.map((embedding, index) => ({
    id: dataList[index].id,
    embedding,
  }));
}

export const mapAndFilterData = (data: any) => {
  return (
    Object.entries(data)
      .filter(
        ([key, value]) =>
          value && (config.fields.length === 0 || config.fields.includes(key))
      )
      /* eslint-disable no-unused-vars */
      .map(([_, value]) =>
        typeof value === 'string' ? value : JSON.stringify(value)
      )
  );
};
