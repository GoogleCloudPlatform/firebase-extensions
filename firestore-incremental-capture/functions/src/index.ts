import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import config from './config';

import {syncDataHandler} from './tasks/sync_data_handler';
import {onCompleteHandler} from './dataflow/on_complete_handler';
import {syncDataTaskHandler} from './tasks/sync_data_task_handler';
import {buildFlexTemplateHandler} from './dataflow/build_flex_template';
import {onBackupRestoreHandler} from './tasks/on_backup_restore_handler';
import {runInitialSetupHandler} from './tasks/run_initial_setup_handler';
import {onHttpRunRestorationHandler} from './tasks/on_http_run_restoration_handler';
import {onFirestoreCloudTaskBackupInitHandler} from './tasks/on_firestore_cloud_task_backup_init_handler';

admin.initializeApp();

/**
 * Sync data to BigQuery, triggered by any change to a Firestore document
 * */
export const syncData = functions.firestore
  .document(config.syncCollectionPath)
  .onWrite(async (change, ctx) => await syncDataHandler(change, ctx));

/**
 * Cloud task to handle data sync
 * */
export const syncDataTask = functions.tasks
  .taskQueue()
  .onDispatch(syncDataTaskHandler);

/**
 * Backup the entire database on initial deployment
 * */
export const runInitialSetup = async () => await runInitialSetupHandler();

/**
 * Handles the export of the database to storage
 */
export const onFirestoreBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onFirestoreCloudTaskBackupInitHandler(data));

/**
 * Run a backup restoration.
 * */
export const onHttpRunRestoration = functions.https.onRequest(
  async () => await onHttpRunRestorationHandler()
);

export const onBackupRestore = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onBackupRestoreHandler(data));

/**
 * Cloud task for handling database restoration
 * */
export const onFirestoreCloudTaskBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onFirestoreCloudTaskBackupInitHandler(data));

/**
 * Cloud task for staging the dataflow template
 * */
export const buildFlexTemplate = functions.tasks
  .taskQueue()
  .onDispatch(async () => await buildFlexTemplateHandler());

export const onCloudBuildComplete = functions.https.onRequest(
  async (payload: any) => await onCompleteHandler(payload)
);
