import {logger} from 'firebase-functions/v1';
import {initialize} from '../bigquery';
import {getExtensions} from 'firebase-admin/extensions';
import * as admin from 'firebase-admin';
import config from '../config';
import {createExport} from '../utils/importExport';
import {getFunctions} from 'firebase-admin/functions';
import {stageTemplate} from '../dataflow/cloudbuild';

export async function runInitialSetupHandler() {
  /** Setup the db */
  const db = admin.firestore();

  /** Setup runtime */
  const runtime = getExtensions().runtime();

  await runtime.setProcessingState(
    'NONE',
    `Creating/updating dataset and table ${config.bqDataset}.${config.bqtable}`
  );

  /** Setup sync dataset and tables */
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

  /** Export the Firestore db to storage */
  const {id, operation} = await createExport();

  /** Update Firestore for tracking */
  await db.doc(config.statusDoc).set({
    status: 'Preparing export...',
    operation: operation.name,
  });

  /** Update the list of backups */
  await db.doc(config.backupDoc).collection('exports').doc(`${id}`).set({
    status: 'Running...',
    operation: operation.name,
  });

  // Add a cloud task to track the progress of the export
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/onFirestoreBackupInit`,
    config.instanceId
  );

  await queue.enqueue({
    id,
    name: operation.name,
  });

  await getFunctions()
    .taskQueue(
      `locations/${config.location}/functions/stageDataFlowTemplate`,
      config.instanceId
    )
    .enqueue({});

  return runtime.setProcessingState(
    'PROCESSING_COMPLETE',
    `All tasks completed successfully.`
  );
}
