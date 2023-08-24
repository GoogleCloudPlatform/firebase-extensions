/* eslint-disable node/no-unsupported-features/es-builtins */
import * as admin from 'firebase-admin';
import {
  BigQuery,
  BigQueryTimestamp,
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
} from '@google-cloud/bigquery';
import {TaskQueue} from 'firebase-admin/functions';

import config from './config';
import {ExportTask} from './types';
import {ExportData} from './ExportData';

/** Bigquery utils */

export function convertUnsupportedDataTypes(row: any) {
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof BigQueryTimestamp) {
      row[key] = admin.firestore.Timestamp.fromDate(new Date(value.value));
    } else if (value instanceof BigQueryDate) {
      row[key] = admin.firestore.Timestamp.fromDate(new Date(value.value));
    } else if (value instanceof BigQueryTime) {
      row[key] = admin.firestore.Timestamp.fromDate(new Date(value.value));
    } else if (value instanceof BigQueryDatetime) {
      row[key] = admin.firestore.Timestamp.fromDate(new Date(value.value));
    } else if (value instanceof Date) {
      row[key] = admin.firestore.Timestamp.fromDate(value);
    } else if (value instanceof Buffer) {
      row[key] = new Uint8Array(value);
    } else if (typeof value === 'object' && value !== null) {
      row[key] = convertUnsupportedDataTypes(value);
    }
  }
  return row;
}
// TODO: just get this from table metadata instead of running query
export const getTableLength = async (
  projectId: string,
  datasetId: string,
  tableName: string
) => {
  // get number of rows in table
  // TODO: just get from table metadata instead of running query
  const query = `SELECT COUNT(*) FROM \`${projectId}.${datasetId}.${tableName}\``;
  const bigquery = new BigQuery();
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: config.bigqueryDatasetLocation,
  };
  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  const [rows] = await job.getQueryResults();
  const rowCount = rows[0].f0_;
  return rowCount;
};
/** executes BQ query and serializes to firestore friendly data */
export const getRows = async (query: string) => {
  const bigquery = new BigQuery();
  const options = {
    query,
  };
  // Run the query as a job
  const [job] = await bigquery.createQueryJob(options);
  const [rows] = await job.getQueryResults();
  return rows.map(convertUnsupportedDataTypes);
};

//** Misc */

export const enqueueExportTask = async (
  queue: TaskQueue,
  exportData: ExportData,
  task: ExportTask
) => {
  await queue.enqueue({
    exportDataObject: exportData.toObject(),
    task,
  });
};

export const isAssociatedWithExt = async (
  db: admin.firestore.Firestore,
  transferConfigId: string
) => {
  const q = db
    .collection(config.firestoreCollection)
    .where('extInstanceId', '==', config.instanceId);
  const results = await q.get();

  return results.docs.filter(d => d.id === transferConfigId).length > 0;
};
