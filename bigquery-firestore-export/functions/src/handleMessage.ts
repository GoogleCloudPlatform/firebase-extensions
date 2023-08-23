/* eslint-disable node/no-unsupported-features/es-builtins */
import * as admin from 'firebase-admin';
import {Config} from './types';
import * as logs from './logs';
import {isAssociatedWithExt} from './utils';
import {exportChunkTriggerHandler} from './exportChunkTriggerHandler';
import {Message} from 'firebase-functions/v1/pubsub';
import {ExportData} from './ExportData';

export const handleMessage = async (
  db: admin.firestore.Firestore,
  config: Config,
  message: Message
) => {
  const exportData = new ExportData(db, {message});

  const hasValidConfig = await isAssociatedWithExt(
    db,
    exportData.transferConfigId
  );

  if (!hasValidConfig) {
    const error = Error(
      `Skipping handling pubsub message because transferConfig '${exportData.transferConfigId}' is not associated with extension instance '${config.instanceId}'.`
    );
    logs.error(error);
    throw error;
  }

  if (exportData.succeeded) {
    // queue up export tasks
    await exportChunkTriggerHandler(exportData);
  } else {
    await db
      .collection(
        `${config.firestoreCollection}/${exportData.transferConfigId}/runs`
      )
      .doc(exportData.runId)
      .set({
        runMetadata: message.json,
      });
  }
};
