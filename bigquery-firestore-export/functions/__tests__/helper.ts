import {BigQuery, Dataset} from '@google-cloud/bigquery';
import bigquery from '@google-cloud/bigquery/build/src/types';

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
