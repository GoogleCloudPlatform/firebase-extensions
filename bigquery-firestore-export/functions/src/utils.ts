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
import {Message} from 'firebase-functions/v1/pubsub';
import {ExportTask} from './types';

const db = admin.firestore();

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
  const query = `SELECT * FROM \`${config.projectId}.${exportData.datasetId}.${exportData.tableName}\` LIMIT ${config.chunkSize} OFFSET ${task.offset}`;
  await queue.enqueue({
    id: task.id,
    query,
    transferConfigId: exportData.transferConfigId,
    runId: exportData.runId,
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

export class ExportData {
  transferConfigId: string;
  runId: string;
  runDocPath?: FirebaseFirestore.DocumentReference['path'];
  runDoc?: FirebaseFirestore.DocumentReference;
  outputCollection?: FirebaseFirestore.CollectionReference;
  datasetId?: string;
  tableName?: string;
  succeeded: boolean;
  constructor(message: Message) {
    const name = message.json.name;
    const splitName = name.split('/');
    this.transferConfigId = splitName[splitName.length - 3];
    this.runId = splitName[splitName.length - 1];
    this.succeeded = message.json.state === 'SUCCEEDED';
    if (this.succeeded) {
      this.tableName = this._getTableName(message);
      this.datasetId = message.json.destinationDatasetId;
      this.runDocPath = `${config.firestoreCollection}/${this.transferConfigId}/runs/${this.runId}`;
      this.runDoc = db.doc(this.runDocPath);
      this.outputCollection = db.collection(`${this.runDocPath}/output`);
    }
  }

  private _getTableName(message: Message) {
    const runTime = new Date(message.json.runTime);
    const hourStr = String(runTime.getUTCHours()).padStart(2, '0');
    const minuteStr = String(runTime.getUTCMinutes()).padStart(2, '0');
    const secondStr = String(runTime.getUTCSeconds()).padStart(2, '0');
    const tableName =
      message.json.params.destination_table_name_template.replace(
        '{run_time|"%H%M%S"}',
        `${hourStr}${minuteStr}${secondStr}`
      );
    return tableName;
  }

  public getQuery(offset: number) {
    return `SELECT * FROM \`${config.projectId}.${this.datasetId}.${this.tableName}\` LIMIT ${config.chunkSize} OFFSET ${offset}`;
  }
}
