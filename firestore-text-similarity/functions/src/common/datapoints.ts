import * as admin from 'firebase-admin';
import {FormattedDatapoint} from '../types/formatted_datapoint';
import config from '../config';
import getEmbeddingsPaLM from './palm_embeddings';
import getEmbeddingsUSE from './use_embeddings';

export const getEmbeddings =
  config.embeddingMethod === 'palm' ? getEmbeddingsPaLM : getEmbeddingsUSE;

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
  return Object.entries(data)
    .filter(
      ([key, value]) =>
        value && (config.fields.length === 0 || config.fields.includes(key))
    )
    .map(([_, value]) =>
      typeof value === 'string' ? value : JSON.stringify(value)
    );
};
