import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as functionsv2 from "firebase-functions/v2";
import config from "./config";

import { runInitialBackupHandler } from "./functions/runInitialBackupHandler";
import { onFirestoreBackupInitHandler } from "./functions/onFirestoreBackupInitHandler";
import { onExportConfig, onExportHandler } from "./functions/onExportConfig";
import { syncDataHandler } from "./functions/syncDataHandler";
import { SyncDataTaskHandler } from "./functions/syncDataTaskHandler";

admin.initializeApp({ projectId: config.projectId });

/**
 * Sync data to BigQuery
 */
export const syncData = functions.firestore
  .document(`${config.syncCollectionPath}`)
  .onWrite(async (change, ctx) => await syncDataHandler(change, ctx));

/**
 *
 * Cloud task to handle data sync
 */
export const syncDataTask = functions.tasks
  .taskQueue()
  .onDispatch(async (data) => await SyncDataTaskHandler(data));

/**
 * Backup the entire database on initial deployment
 */
export const runInitialBackup = async () => await runInitialBackupHandler();

/**
 * This function is triggered by a custom event
 */
export const onExport = functionsv2.eventarc.onCustomEventPublished(
  onExportConfig,
  async (event) => onExportHandler(event)
);

/**
 * This function is triggered by a task queue
 */
export const onFirestoreBackupInit = functions.tasks
  .taskQueue()
  .onDispatch(async (data) => await onFirestoreBackupInitHandler(data));
