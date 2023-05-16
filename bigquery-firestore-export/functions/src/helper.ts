import {Config} from './types';
import * as admin from 'firebase-admin';
import * as logs from './logs';
import {BigQuery, BigQueryTimestamp} from '@google-cloud/bigquery';
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
  console.log('rows', rows);
  logs.writeRunResultsToFirestore(runId);
  const collection = db.collection(
    `${config.firestoreCollection}/${transferConfigId}/runs/${runId}/output`
  );

  // Perform parallel individual writes to Firestore and calculate total number of successes
  // @TODO: Skip processing if the transfer run was already written to Firestore
  const successes = await Promise.all(
    rows.map(row => {
      try {
        collection.add(convertUnsupportedDataTypes(row));
        return 1;
      } catch (err) {
        logs.errorWritingToFirestore(err);
        return 0;
      }
    })
  );

  const succeededRowCount = successes.reduce(
    (partialSum, a) => partialSum + a,
    0
  );

  const failedRowCount = rows.length - succeededRowCount;
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

function convertUnsupportedDataTypes(row: any) {
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof BigQueryTimestamp) {
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
