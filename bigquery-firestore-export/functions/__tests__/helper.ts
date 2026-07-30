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

import {BigQuery} from '@google-cloud/bigquery';

export const generateRandomString = () => {
  return (Math.random() + 1).toString(36).substring(7);
};

export const setupDataset = async (
  bq: BigQuery,
  datasetId: string,
  tableId: string
) => {
  /** Delete if it exists */
  const [exists] = await bq.createDataset(datasetId);
  if (exists) await bq.dataset(datasetId).delete({force: true});

  /** Create Dataset */
  const [dataset] = await bq.createDataset(datasetId);
  const [table] = await dataset.createTable(tableId, {});

  return [dataset, table];
};

export async function deleteAllDocumentsInCollection(db, collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const querySnapshot = await collectionRef.get();

  const batch = db.batch();
  querySnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}
