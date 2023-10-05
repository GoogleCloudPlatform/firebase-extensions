import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

import config from './config';

import {syncDataHandler} from './tasks/on_sync_data_handler';
import {onCompleteHandler} from './dataflow/on_complete_handler';
import {syncDataTaskHandler} from './tasks/sync_data_task_handler';
import {buildFlexTemplateHandler} from './dataflow/build_flex_template';
import {onBackupRestoreHandler} from './tasks/on_backup_restore_handler';
import {runInitialSetupHandler} from './tasks/on_run_initial_setup_handler';
import {onHttpRunRestorationHandler} from './tasks/on_http_run_restoration_handler';
import {onFirestoreBackupInitHandler} from './tasks/on_firestore_backup_init_handler';

admin.initializeApp();

/**
 * Sync data to BigQuery, triggered by any change to a Firestore document
 * */
export const syncData = functions.firestore
  .document(config.syncCollectionPath)
  .onWrite(syncDataHandler);

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
  .onDispatch(onFirestoreBackupInitHandler);

/**
 * Run a backup restoration.
 * */
export const onHttpRunRestoration = functions.https.onRequest(
  onHttpRunRestorationHandler
);

export const onBackupRestore = functions.tasks
  .taskQueue()
  .onDispatch(onBackupRestoreHandler);

/**
 * Cloud task for handling database restoration
 * */
export const onFirestoreCloudTaskBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(onFirestoreBackupInitHandler);

/**
 * Cloud task for staging the dataflow template
 * */
export const buildFlexTemplate = functions.tasks
  .taskQueue()
  .onDispatch(buildFlexTemplateHandler);

export const onCloudBuildComplete =
  functions.https.onRequest(onCompleteHandler);
