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

interface ExportDataParams {
  message?: Message;
  transferConfigId?: string;
  runId?: string;
  tableName?: string;
  datasetId?: string;
  succeeded?: boolean;
}
export class ExportData {
  transferConfigId: string;
  runId: string;
  runDocPath?: string;
  outputCollectionPath?: string;
  datasetId?: string;
  tableName?: string;
  succeeded: boolean;
  constructor(
    db: admin.firestore.Firestore,
    {
      message,
      transferConfigId,
      runId,
      tableName,
      datasetId,
      succeeded,
    }: ExportDataParams
  ) {
    if (message) {
      this.initFromMessage(db, message);
    } else {
      this.initFromObject(db, {
        transferConfigId,
        runId,
        tableName,
        datasetId,
        succeeded,
      });
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

  private initFromMessage(db: FirebaseFirestore.Firestore, message: Message) {
    const name = message.json.name;
    const splitName = name.split('/');
    this.transferConfigId = splitName[splitName.length - 3];
    this.runId = splitName[splitName.length - 1];
    this.succeeded = message.json.state === 'SUCCEEDED';
    if (this.succeeded) {
      this.tableName = this._getTableName(message);
      this.datasetId = message.json.destinationDatasetId;
      this.runDocPath = `${config.firestoreCollection}/${this.transferConfigId}/runs/${this.runId}`;
      this.outputCollectionPath = `${this.runDocPath}/output`;
    }
  }

  private initFromObject(
    db: FirebaseFirestore.Firestore,
    {transferConfigId, runId, tableName, datasetId, succeeded}: ExportDataParams
  ) {
    this.transferConfigId = transferConfigId;
    this.runId = runId;
    this.tableName = tableName;
    this.datasetId = datasetId;
    this.succeeded = succeeded;
    if (this.succeeded) {
      this.runDocPath = `${config.firestoreCollection}/${this.transferConfigId}/runs/${this.runId}`;
      this.outputCollectionPath = `${this.runDocPath}/output`;
    }
  }

  public toObject() {
    return {
      transferConfigId: this.transferConfigId,
      runId: this.runId,
      tableName: this.tableName,
      datasetId: this.datasetId,
      succeeded: this.succeeded,
    };
  }
}
