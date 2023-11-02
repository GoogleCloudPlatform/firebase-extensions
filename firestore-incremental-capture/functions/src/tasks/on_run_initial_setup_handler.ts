/**
 * Copyright 2023 Google LLC
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

import * as admin from 'firebase-admin';

import {logger} from 'firebase-functions/v1';
import {getFunctions} from 'firebase-admin/functions';
import {getExtensions} from 'firebase-admin/extensions';

import config from '../config';

import {initialize} from '../utils/big_query';
import {createExport} from '../utils/import_export';
import {bqBackupSchema} from '../constants/bq_backup_schema';

export async function runInitialSetupHandler() {
  // Setup the db
  const db = admin.firestore();

  // Setup runtime
  const runtime = getExtensions().runtime();

  await runtime.setProcessingState(
    'NONE',
    `Creating/updating dataset and table ${config.bqDataset}.${config.bqtable}`
  );

  // Setup sync dataset and tables
  const [syncDataset, syncTable] = await initialize(
    config.bqDataset,
    config.bqtable,
    bqBackupSchema
  );

  logger.info(`Initialized dataset and table ${syncDataset}.${syncTable}`);

  if (!config.runInitialBackup) {
    return runtime.setProcessingState(
      'PROCESSING_COMPLETE',
      `Initial Backup is disabled, the extension will start recording updates for ${config.syncCollectionPath}.`
    );
  }

  await runtime.setProcessingState(
    'NONE',
    `Setting up initial backup for ${config.syncCollectionPath}...`
  );

  // Export the Firestore db to storage
  const {id, operation} = await createExport();

  // Update Firestore for tracking
  await db.doc(config.statusDoc).set({
    status: 'Preparing export...',
    operation: operation.name,
  });

  // Update the list of backups
  await db.doc(config.backupDoc).collection('exports').doc(`${id}`).set({
    status: 'Running...',
    operation: operation.name,
  });

  logger.info(
    `Queuing Firestore backup task: locations/${config.location}/functions/ext-${config.instanceId}-onFirestoreBackupInit`
  );

  // Add a cloud task to track the progress of the export
  const backupQueue = getFunctions().taskQueue(
    `locations/${config.location}/functions/onFirestoreBackupInit`,
    config.instanceId
  );

  await backupQueue.enqueue({
    id,
    name: operation.name,
  });

  return runtime.setProcessingState(
    'PROCESSING_COMPLETE',
    'All tasks completed successfully.'
  );
}
