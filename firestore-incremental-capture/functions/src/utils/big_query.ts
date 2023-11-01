import {storage} from 'firebase-admin';
import {BigQuery, Dataset} from '@google-cloud/bigquery';

import config from '../config';
import * as logs from '../logs';

const bq = new BigQuery({projectId: config.projectId});

function bigqueryDataset(databaseId: string) {
  return bq.dataset(databaseId, {
    location: config.datasetLocation,
  });
}

async function initializeDataset(databaseId: string) {
  let dataset: Dataset = bigqueryDataset(databaseId);
  const [datasetExists] = await dataset.exists();

  if (datasetExists) {
    logs.bigQueryDatasetExists(databaseId);
    return dataset;
  }

  /** Create table if does not exisst */
  try {
    logs.bigQueryDatasetCreating(databaseId);
    [dataset] = await bq.createDataset(databaseId, {
      location: config.datasetLocation,
    });
    logs.bigQueryDatasetCreated(databaseId);
    return dataset;
  } catch (ex: any) {
    logs.datasetCeationError(databaseId);
    return dataset;
  }
}

async function initializeTable(
  databaseId: string,
  tableId: string,
  schema: Record<any, any>[] | null = null
) {
  let table;
  const dataset: Dataset = bigqueryDataset(databaseId);
  table = dataset.table(tableId);
  const [tableExists] = await table.exists();

  /** Return if table exists */
  logs.bigQueryTableExists(tableId);
  if (tableExists) return table;

  /** Create a new table and return */
  try {
    logs.bigQueryTableCreating(tableId);

    if (!dataset.id || !schema)
      throw new Error('Dataset ID and schema must not be undefined');

    /**
     * TODO: Add time partitioning
     * TODO: Include expirationMs for partitioning based on config
     */
    [table] = await bq.dataset(dataset.id).createTable(tableId, {
      schema,
      location: config.datasetLocation,
    });

    logs.bigQueryTableCreated(tableId);
    return table;
  } catch (ex: any) {
    logs.tableCreationError(config.bqDataset, ex.message);
    return dataset;
  }
}

export async function initialize(
  databaseId: string,
  tableId: string,
  schema: Record<any, any>[] | null = null
) {
  const dataset = await initializeDataset(databaseId);
  const table = await initializeTable(databaseId, tableId, schema);

  return [dataset, table];
}

export async function getTable(datasetId: string, tableId: string) {
  return bq.dataset(datasetId).table(tableId);
}

/**
 * Export the Firestore db to storage
 * TODO: This may now be obsolete. We can restore a database, and then replay the data through dataflow.
 */
export const exportToBQ = async (id: string) => {
  const name = config.instanceId;
  const filename = `${config.bucketPath}/${id}/all_namespaces/kind_${name}/all_namespaces_kind_${name}.export_metadata`;
  const bucket = storage().bucket(`gs://${config.bucketName}`);
  const file = bucket.file(filename);

  /**
   * writeDisposition to overwire the table, if exists
   */

  return bq.dataset(config.bqDataset).table(config.bqtable).load(file, {
    writeDisposition: 'WRITE_TRUNCATE',
  });
};
