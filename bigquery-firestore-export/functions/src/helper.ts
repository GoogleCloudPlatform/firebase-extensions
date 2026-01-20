/**
 * Copyright 2025 Google LLC
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

/* eslint-disable node/no-unsupported-features/es-builtins */
import {Config, TransferRunMessage, BigQueryRow, FirestoreRow} from './types';
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

/** Parsed components from a transfer run resource name */
export interface ParsedTransferRunName {
  projectId: string;
  location: string;
  transferConfigId: string;
  runId: string;
}

/** Parsed components from a transfer config resource name */
export interface ParsedTransferConfigName {
  projectId: string;
  location: string;
  transferConfigId: string;
}

// Regex for transfer run name: projects/{projectId}/locations/{location}/transferConfigs/{configId}/runs/{runId}
const TRANSFER_RUN_NAME_REGEX =
  /^projects\/([^/]+)\/locations\/([^/]+)\/transferConfigs\/([^/]+)\/runs\/([^/]+)$/;

// Regex for transfer config name: projects/{projectId}/locations/{location}/transferConfigs/{configId}
const TRANSFER_CONFIG_NAME_REGEX =
  /^projects\/([^/]+)\/locations\/([^/]+)\/transferConfigs\/([^/]+)$/;

/**
 * Parses a transfer run resource name and extracts its components.
 * @param name The full resource name (e.g., projects/123/locations/us/transferConfigs/abc/runs/xyz)
 * @returns Parsed components
 * @throws Error if the name format is invalid
 */
export function parseTransferRunName(name: string): ParsedTransferRunName {
  const match = name.match(TRANSFER_RUN_NAME_REGEX);
  if (!match) {
    const error = new Error(
      `Invalid transfer run name format: "${name}". Expected format: projects/{projectId}/locations/{location}/transferConfigs/{configId}/runs/{runId}`
    );
    throw error;
  }
  return {
    projectId: match[1],
    location: match[2],
    transferConfigId: match[3],
    runId: match[4],
  };
}

/**
 * Parses a transfer config resource name and extracts its components.
 * @param name The full resource name (e.g., projects/123/locations/us/transferConfigs/abc)
 * @returns Parsed components
 * @throws Error if the name format is invalid
 */
export function parseTransferConfigName(
  name: string
): ParsedTransferConfigName {
  const match = name.match(TRANSFER_CONFIG_NAME_REGEX);
  if (!match) {
    const error = new Error(
      `Invalid transfer config name format: "${name}". Expected format: projects/{projectId}/locations/{location}/transferConfigs/{configId}`
    );
    throw error;
  }
  return {
    projectId: match[1],
    location: match[2],
    transferConfigId: match[3],
  };
}

/**
 * Updates the "latest" run document in Firestore for a transfer config.
 * Uses a transaction to prevent race conditions from concurrent Pub/Sub messages.
 * Updates if: no doc exists, doc is corrupted/incomplete, current run is newer,
 * or same run is being refreshed (handles Pub/Sub redelivery).
 * @param db Firestore database instance
 * @param transferConfigId The transfer config ID
 * @param runId The run ID
 * @param message The transfer run message
 * @param rowCounts Row counts - explicit zeros for failed runs, actual counts for success
 */
export const updateLatestRunDocument = async (
  db: admin.firestore.Firestore,
  transferConfigId: string,
  runId: string,
  message: TransferRunMessage,
  rowCounts: {failedRowCount: number; totalRowCount: number}
) => {
  const latestRef = db
    .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
    .doc('latest');

  const runTime = new Date(message.json.runTime);

  const docUpdate = {
    runMetadata: message.json,
    latestRunId: runId,
    ...rowCounts,
  };

  await db.runTransaction(async transaction => {
    const latest = await transaction.get(latestRef);
    const latestData = latest.data();
    const existingRunTime = latestData?.runMetadata?.runTime;
    const existingRunId = latestData?.latestRunId;

    // Update if:
    // 1. No doc exists
    // 2. Doc is corrupted/incomplete (missing runTime)
    // 3. Current run is newer
    // 4. Same run is being refreshed (handles Pub/Sub redelivery with updated data)
    const shouldUpdate =
      !latestData ||
      !existingRunTime ||
      new Date(existingRunTime) < runTime ||
      existingRunId === runId;

    if (shouldUpdate) {
      transaction.set(latestRef, docUpdate);
    } else {
      logs.latestDocUpdateSkipped(
        transferConfigId,
        runId,
        `existing run is newer (${existingRunTime} >= ${message.json.runTime})`
      );
    }
  });
};

export const getBigqueryResults = async (
  projectId: string,
  transferConfigId: string,
  runId: string,
  datasetId: string,
  tableName: string
) => {
  const query = `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\``;
  const bigquery = new BigQuery();
  const options = {
    query: query,
    // Location must match that of the dataset(s) referenced in the query.
    location: config.bigqueryDatasetLocation,
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    logs.bigqueryJobStarted(job.id);

    const [rows] = await job.getQueryResults();
    logs.bigqueryResultsRowCount(transferConfigId, runId, rows.length);
    return rows;
  } catch (error) {
    logs.bigqueryQueryFailed(
      transferConfigId,
      runId,
      tableName,
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
};

// Runs a SELECT * query on target tableName and writes results to corresponding firestore collection
export const writeRunResultsToFirestore = async (
  db: admin.firestore.Firestore,
  message: TransferRunMessage
) => {
  const {transferConfigId, runId} = parseTransferRunName(message.json.name);
  const runTime = new Date(message.json.runTime);
  const hourStr = String(runTime.getUTCHours()).padStart(2, '0');
  const minuteStr = String(runTime.getUTCMinutes()).padStart(2, '0');
  const secondStr = String(runTime.getUTCSeconds()).padStart(2, '0');
  // TODO: Consider making table name template parsing more robust.
  // Currently assumes exact format '{run_time|"%H%M%S"}'. If BigQuery
  // changes the template format, this replacement may fail.
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

  const rowCounts = {failedRowCount, totalRowCount: rows.length};

  // Update the run document in Firestore with metadata about the transfer run and number of successful writes.
  await db
    .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
    .doc(runId)
    .set({
      runMetadata: message.json,
      ...rowCounts,
    });

  // Update the latest run document in Firestore for this transfer config.
  // Uses transaction internally to prevent race conditions.
  await updateLatestRunDocument(
    db,
    transferConfigId,
    runId,
    message,
    rowCounts
  );
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
  message: TransferRunMessage
) => {
  const {transferConfigId, runId} = parseTransferRunName(message.json.name);

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
  if (message.json.state === 'SUCCEEDED') {
    await writeRunResultsToFirestore(db, message);
  } else {
    // Log handling of non-success state
    logs.handlingNonSuccessRun(transferConfigId, runId, message.json.state);

    // Explicit zero counts for non-success runs (clearer API shape than omitting)
    const rowCounts = {failedRowCount: 0, totalRowCount: 0};

    // Write run document for non-success states
    await db
      .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
      .doc(runId)
      .set({
        runMetadata: message.json,
        ...rowCounts,
      });

    // Also update "latest" for failed/pending runs so users can see current state
    await updateLatestRunDocument(
      db,
      transferConfigId,
      runId,
      message,
      rowCounts
    );
  }
};

/**
 * Converts BigQuery data types to Firestore-compatible types
 * @param row Object containing data to convert
 * @returns Object with converted values
 */
export function convertUnsupportedDataTypes(row: null): null;
export function convertUnsupportedDataTypes(row: string): string;
export function convertUnsupportedDataTypes(row: number): number;
export function convertUnsupportedDataTypes(row: boolean): boolean;
export function convertUnsupportedDataTypes(row: BigQueryRow): FirestoreRow;
export function convertUnsupportedDataTypes(
  row: BigQueryRow | null | string | number | boolean
): FirestoreRow | null | string | number | boolean {
  if (row === null || typeof row !== 'object') {
    return row as string | number | boolean | null;
  }

  const result = {...row} as FirestoreRow;

  /**
   * Checks if a value is a BigQuery datetime-related type
   */
  function shouldConvertToTimestamp(
    value: unknown
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
      result[key] = convertUnsupportedDataTypes(value as BigQueryRow);
    }
  }

  return result;
}
