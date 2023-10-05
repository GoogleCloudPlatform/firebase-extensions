import * as admin from 'firebase-admin';

import {logger} from 'firebase-functions/v1';
import {getFunctions} from 'firebase-admin/functions';
import {getExtensions} from 'firebase-admin/extensions';

import config from '../config';
import {initialize} from '../utils/big_query';
import {createExport} from '../utils/import_export';
import {buildFlexTemplate, onFirestoreBackupInit} from '../index';

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
    [
      {name: 'documentId', type: 'STRING', mode: 'REQUIRED'},
      {name: 'documentPath', type: 'STRING', mode: 'REQUIRED'},
      {name: 'beforeData', type: 'JSON'},
      {name: 'afterData', type: 'JSON'},
      {name: 'changeType', type: 'STRING', mode: 'REQUIRED'},
      {name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED'},
    ]
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
    `Queuing Firestore backup task: locations/${config.location}/functions/ext-${config.instanceId}-${onFirestoreBackupInit.name}`
  );

  // Add a cloud task to track the progress of the export
  const queue1 = getFunctions().taskQueue(
    `locations/${config.location}/functions/${onFirestoreBackupInit.name}`,
    config.instanceId
  );

  await queue1.enqueue({
    id,
    name: operation.name,
  });

  logger.info(
    `Queuing a task for building the template: locations/${config.location}/functions/ext-${config.instanceId}-${onFirestoreBackupInit.name}`
  );

  const queue2 = getFunctions().taskQueue(
    `locations/${config.location}/functions/${buildFlexTemplate.name}`,
    config.instanceId
  );

  await queue2.enqueue({});

  return runtime.setProcessingState(
    'PROCESSING_COMPLETE',
    'All tasks completed successfully.'
  );
}
