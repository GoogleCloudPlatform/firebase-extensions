/* eslint-disable node/no-unsupported-features/es-builtins */
import {Config} from './types';
import * as admin from 'firebase-admin';
import * as logs from './logs';
import {
  BigQuery,
  BigQueryTimestamp,
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  Geography,
} from '@google-cloud/bigquery';
import config from './config';

export const getBigqueryResults = async (
  projectId: string,
  transferConfigId: string,
  runId: string,
  datasetId: string,
  tableName: string
) => {
  // Run select * query from tableName
  const query = `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\``;
  const bigquery = new BigQuery();
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: config.bigqueryDatasetLocation,
  };
  // Run the query as a job

  const [job] = await bigquery.createQueryJob(options);

  logs.bigqueryJobStarted(job.id);

  // Wait for the query to finish
  const [rows] = await job.getQueryResults();
  logs.bigqueryResultsRowCount(transferConfigId, runId, rows.length);
  return rows;
};

// Runs a SELECT * query on target tableName and writes results to corresponding firestore collection
export const writeRunResultsToFirestore = async (
  db: admin.firestore.Firestore,
  message
) => {
  const name = message.json.name;
  const splitName = name.split('/');
  const transferConfigId = splitName[splitName.length - 3];
  const runId = splitName[splitName.length - 1];
  const runTime = new Date(message.json.runTime);
  const hourStr = String(runTime.getUTCHours()).padStart(2, '0');
  const minuteStr = String(runTime.getUTCMinutes()).padStart(2, '0');
  const secondStr = String(runTime.getUTCSeconds()).padStart(2, '0');
  const tableName = message.json.params.destination_table_name_template.replace(
    '{run_time|"%H%M%S"}',
    `${hourStr}${minuteStr}${secondStr}`
  );

  const datasetId = message.json.destinationDatasetId;
  const rows = await getBigqueryResults(
    config.projectId,
    transferConfigId,
    runId,
    datasetId,
    tableName
  );
  logs.writeRunResultsToFirestore(runId);
  const collection = db.collection(
    `${config.firestoreCollection}/${transferConfigId}/runs/${runId}/output`
  );
  // break rows up into chunks of at most 10000
  const CHUNK_SIZE = 10000;

  const rowLength = rows.length;

  let succeededRowCount = 0;

  for (let i = 0; i < rowLength; i += CHUNK_SIZE) {
    const promises = [];

    for (let j = i; j < i + CHUNK_SIZE && j < rowLength; j++) {
      promises.push(collection.add(convertUnsupportedDataTypes(rows[j])));
    }

    const results =
      await Promise.allSettled<
        admin.firestore.DocumentReference<admin.firestore.DocumentData>
      >(promises);

    for (let k = 0; k < results.length; k++) {
      const result = results[k];
      if (result.status === 'fulfilled') {
        succeededRowCount++;
      } else {
        logs.errorWritingToFirestore(result.reason);
      }
    }
  }

  const failedRowCount = rowLength - succeededRowCount;
  logs.runResultsWrittenToFirestore(runId, succeededRowCount, rows.length);

  // @TODO: Update run docs in a single transaction

  // Update the run document in Firestore with metadata about the transfer run and number of sucecssful writes.
  await db
    .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
    .doc(runId)
    .set({
      runMetadata: message.json,
      failedRowCount,
      totalRowCount: rows.length,
    });

  // Update the latest run document in Firestore for this transfer config as well.
  const latest = await db
    .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
    .doc('latest')
    .get();

  const docUpdate = {
    runMetadata: message.json,
    latestRunId: runId,
    failedRowCount,
    totalRowCount: rows.length,
  };
  if (!latest.data()) {
    await db
      .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
      .doc('latest')
      .set(docUpdate);
  } else if (
    !!latest.data().runMetadata &&
    !!latest.data().runMetadata.runTime &&
    new Date(latest.data().runMetadata.runTime) < runTime
  ) {
    await db
      .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
      .doc('latest')
      .set(docUpdate);
  }
};

export const transferConfigAssociatedWithExtension = async (
  db: admin.firestore.Firestore,
  transferConfigId: string
) => {
  const q = db
    .collection(config.firestoreCollection)
    .where('extInstanceId', '==', config.instanceId);
  const results = await q.get();

  return results.docs.filter(d => d.id === transferConfigId).length > 0;
};

export const handleMessage = async (
  db: admin.firestore.Firestore,
  config: Config,
  message
) => {
  const name = message.json.name;
  const splitName = name.split('/');
  const transferConfigId = splitName[splitName.length - 3];

  const hasValidConfig = await transferConfigAssociatedWithExtension(
    db,
    transferConfigId
  );

  if (!hasValidConfig) {
    const error = Error(
      `Skipping handling pubsub message because transferConfig '${transferConfigId}' is not associated with extension instance '${config.instanceId}'.`
    );
    logs.error(error);
    throw error;
  }

  const runId = splitName[splitName.length - 1];
  if (message.json.state === 'SUCCEEDED') {
    await writeRunResultsToFirestore(db, message);
  } else {
    await db
      .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
      .doc(runId)
      .set({
        runMetadata: message.json,
      });
  }
};

/**
 * Converts BigQuery data types to Firestore-compatible types
 * @param row Object containing data to convert
 * @returns Object with converted values
 */
function convertUnsupportedDataTypes(row: any): any {
  if (row === null || typeof row !== 'object') {
    return row;
  }

  const result = {...row};

  /**
   * Checks if a value is a BigQuery datetime-related type
   */
  function shouldConvertToTimestamp(
    value: any
  ): value is
    | BigQueryTimestamp
    | BigQueryDate
    | BigQueryTime
    | BigQueryDatetime {
    return (
      value instanceof BigQueryTimestamp ||
      value instanceof BigQueryDate ||
      value instanceof BigQueryTime ||
      value instanceof BigQueryDatetime
    );
  }

  for (const [key, value] of Object.entries(row)) {
    if (value === null || typeof value !== 'object') continue;

    if (shouldConvertToTimestamp(value)) {
      // Convert all BigQuery datetime types to Firestore Timestamp
      result[key] = admin.firestore.Timestamp.fromDate(new Date(value.value));
    } else if (value instanceof Date) {
      result[key] = admin.firestore.Timestamp.fromDate(value);
    } else if (value instanceof Buffer) {
      result[key] = new Uint8Array(value);
    } else if (value instanceof Geography) {
      result[key] = value.value;
    } else if (typeof value === 'object') {
      // Recursively convert nested objects
      result[key] = convertUnsupportedDataTypes(value);
    }
  }

  return result;
}
