import {logger} from 'firebase-functions/v1';
import {initialize} from '../bigquery';
import {getExtensions} from 'firebase-admin/extensions';
import * as admin from 'firebase-admin';
import config from '../config';
import {createExport} from '../export';
import {getFunctions} from 'firebase-admin/functions';
import {on} from 'events';
import {prepareDataFlowTemplate} from './prepareDataFlowTemplate';

export async function runInitialBackupHandler() {
  /** Setup the db */
  const db = admin.firestore();

  /** Setup backup dataset and tables */
  const [backupDataset, backupTable] = await initialize(
    config.dataset,
    config.table
  );

  logger.info(
    `Initialized dataset and table ${backupDataset.id}.${backupTable.id}`
  );

  /** Setup sync dataset and tables */

  const [syncDataset, syncTable] = await initialize(
    config.syncDataset,
    config.syncTable,
    [
      {name: 'documentId', type: 'STRING', mode: 'REQUIRED'},
      {name: 'documentPath', type: 'STRING', mode: 'REQUIRED'},
      {name: 'beforeData', type: 'JSON', mode: 'REQUIRED'},
      {name: 'afterData', type: 'JSON', mode: 'REQUIRED'},
      {name: 'changeType', type: 'STRING', mode: 'REQUIRED'},
      {name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED'},
    ]
  );

  logger.info(`Initialized dataset and table ${syncDataset}.${syncTable}`);

  const runtime = getExtensions().runtime();

  const collection = db.collection(config.statusCollectionName);

  if (!config.runInitialBackup) {
    return runtime.setProcessingState(
      'PROCESSING_WARNING',
      `Initial Backup is disabled, the extension will start recording updates for ${config.backupCollectionName}.`
    );
  }

  /** Export the Firestore db to storage */
  const {id, operation} = await createExport();

  /** Update Firestore for tracking */
  await collection.doc(`${id}`).set({
    status: 'Preparing export...',
    operation: operation.name,
  });

  // Upload the DataFlow template to Cloud Storage
  await prepareDataFlowTemplate();

  // Add a cloud task to track the progress of the export
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/onFirestoreBackupInit`,
    config.instanceId
  );

  return queue.enqueue({
    id,
    name: operation.name,
  });
}
