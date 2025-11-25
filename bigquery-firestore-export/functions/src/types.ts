import * as admin from 'firebase-admin';
import {
  BigQueryTimestamp,
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  Geography,
} from '@google-cloud/bigquery';

export interface Config {
  location: string;
  bigqueryDatasetLocation: string;
  projectId: string;
  instanceId: string;
  transferConfigName?: string;
  datasetId?: string;
  tableName?: string;
  queryString?: string;
  partitioningField?: string;
  schedule?: string;
  pubSubTopic: string;
  firestoreCollection: string;
  displayName?: string;
}

/**
 * Parameters for a BigQuery scheduled query transfer run
 */
export interface TransferRunParams {
  destination_table_name_template: string;
  partitioning_field: string;
  query: string;
  write_disposition: string;
}

/**
 * State of a BigQuery Data Transfer run
 */
export type TransferRunState =
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PENDING'
  | 'RUNNING'
  | 'TRANSFER_STATE_UNSPECIFIED';

/**
 * JSON payload from BigQuery Data Transfer PubSub notification
 */
export interface TransferRunPayload {
  name: string;
  runTime: string;
  state: TransferRunState;
  destinationDatasetId: string;
  dataSourceId: string;
  schedule: string;
  scheduleTime: string;
  startTime: string;
  endTime: string;
  updateTime: string;
  userId: string;
  notificationPubsubTopic: string;
  params: TransferRunParams;
  emailPreferences: Record<string, unknown>;
  errorStatus: Record<string, unknown>;
}

/**
 * Message structure for BigQuery Data Transfer run notifications
 */
export interface TransferRunMessage {
  json: TransferRunPayload;
}

/**
 * Possible values in a BigQuery row before conversion
 */
export type BigQueryRowValue =
  | string
  | number
  | boolean
  | null
  | Date
  | Buffer
  | BigQueryTimestamp
  | BigQueryDate
  | BigQueryTime
  | BigQueryDatetime
  | Geography
  | BigQueryRow
  | BigQueryRowValue[];

/**
 * A single row from BigQuery query results
 */
export interface BigQueryRow {
  [key: string]: BigQueryRowValue;
}

/**
 * Possible values in a Firestore-compatible row after conversion
 */
export type FirestoreRowValue =
  | string
  | number
  | boolean
  | null
  | admin.firestore.Timestamp
  | Uint8Array
  | FirestoreRow
  | FirestoreRowValue[];

/**
 * A single row converted to Firestore-compatible types
 */
export interface FirestoreRow {
  [key: string]: FirestoreRowValue;
}
