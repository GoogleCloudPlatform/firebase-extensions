/* eslint-disable node/no-unsupported-features/es-builtins */
import * as admin from 'firebase-admin';
import {Config} from './types';
import * as logs from './logs';
import {isAssociatedWithExt} from './utils';
import {exportChunkTriggerHandler} from './exportChunkTriggerHandler';
import {Message} from 'firebase-functions/v1/pubsub';

export const handleMessage = async (
  db: admin.firestore.Firestore,
  config: Config,
  message: Message
) => {
  const name = message.json.name;
  const splitName = name.split('/');
  const transferConfigId = splitName[splitName.length - 3];

  const hasValidConfig = await isAssociatedWithExt(db, transferConfigId);

  if (!hasValidConfig) {
    const error = Error(
      `Skipping handling pubsub message because transferConfig '${transferConfigId}' is not associated with extension instance '${config.instanceId}'.`
    );
    logs.error(error);
    throw error;
  }

  const runId = splitName[splitName.length - 1];

  if (message.json.state === 'SUCCEEDED') {
    const name = message.json.name;
    const splitName = name.split('/');
    const transferConfigId = splitName[splitName.length - 3];
    const runId = splitName[splitName.length - 1];
    const runTime = new Date(message.json.runTime);
    const hourStr = String(runTime.getUTCHours()).padStart(2, '0');
    const minuteStr = String(runTime.getUTCMinutes()).padStart(2, '0');
    const secondStr = String(runTime.getUTCSeconds()).padStart(2, '0');
    const tableName =
      message.json.params.destination_table_name_template.replace(
        '{run_time|"%H%M%S"}',
        `${hourStr}${minuteStr}${secondStr}`
      );
    const datasetId = message.json.destinationDatasetId;

    // queue up export tasks
    await exportChunkTriggerHandler({
      transferConfigId,
      runId,
      datasetId,
      tableName,
    });
  } else {
    await db
      .collection(`${config.firestoreCollection}/${transferConfigId}/runs`)
      .doc(runId)
      .set({
        runMetadata: message.json,
      });
  }
};
