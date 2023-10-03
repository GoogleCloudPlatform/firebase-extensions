import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import config from './config';

import {runInitialSetupHandler} from './tasks/runInitialSetupHandler';
import {onFirestoreCloudTaskBackupInitHandler} from './tasks/onFirestoreCloudTaskBackupInitHandler';

import {syncDataHandler} from './tasks/syncDataHandler';
import {SyncDataTaskHandler as syncDataTaskHandler} from './tasks/syncDataTaskHandler';
import {buildFlexTemplateHandler} from './dataflow/buildFlexTemplate';
import {onHttpRunRestorationHandler} from './tasks/onHttpRunRestorationHandler';
import {onBackupRestoreHandler} from './tasks/onBackupRestoreHandler';
import {onCompleteHandler} from './dataflow/onCompleteHandler';

admin.initializeApp();

/** Sync data to BigQuery, triggered by any change to a Firestore document */
export const syncData = functions.firestore
  .document(`${config.syncCollectionPath}`)
  .onWrite(async (change, ctx) => await syncDataHandler(change, ctx));

/** Cloud task to handle data sync */
export const syncDataTask = functions.tasks
  .taskQueue()
  .onDispatch(async data => await syncDataTaskHandler(data));

/** Backup the entire database on initial deployment */
export const runInitialSetup = async () => await runInitialSetupHandler();

/** Handles the export of the database to storage */
export const onFirestoreBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onFirestoreCloudTaskBackupInitHandler(data));

/* Run a backup restoration */
export const onHttpRunRestoration = functions.https.onRequest(
  async () => await onHttpRunRestorationHandler()
);

export const onBackupRestore = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onBackupRestoreHandler(data));

/** Cloud task for handling database restoration */
export const onFirestoreCloudTaskBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(async data => await onFirestoreCloudTaskBackupInitHandler(data));

/** Cloud task for staging the dataflow template */
export const buildFlexTemplate = functions.tasks
  .taskQueue()
  .onDispatch(async () => await buildFlexTemplateHandler());

export const onCloudBuildComplete = functions.https.onRequest(
  async (payload: any) => await onCompleteHandler(payload)
);
