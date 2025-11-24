/**
 * Copyright 2025 Google LLC
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
import * as functions from 'firebase-functions/v1';
import {getExtensions} from 'firebase-admin/extensions';

import * as logs from './logs';
import config from './config';
import * as helper from './helper';
import * as dts from './dts';
import {TransferRunMessage} from './types';

logs.init();

/**
 * Initializes Admin SDK & SMTP connection if not already initialized.
 */

admin.initializeApp({projectId: config.projectId});
const db = admin.firestore();

export const upsertTransferConfig = functions.tasks
  .taskQueue()
  .onDispatch(async () => {
    const runtime = getExtensions().runtime();

    if (config.transferConfigName) {
      const nameSplit = config.transferConfigName.split('/');
      const transferConfigId = nameSplit[nameSplit.length - 1];

      // Ensure the latest transfer config object is stored in Firestore.
      // If Firestore already contains an extension instance matching this config ID, the extension
      // will overwrite the existing config with the latest config from the API
      const transferConfig = await dts.getTransferConfig(
        config.transferConfigName
      );

      if (!transferConfig) {
        await runtime.setProcessingState(
          'PROCESSING_COMPLETE',
          'Transfer Config Name was provided, but the transfer config could not be retrieved from BigQuery.'
        );
        return;
      }

      await db
        .collection(config.firestoreCollection)
        .doc(transferConfigId)
        .set({
          extInstanceId: config.instanceId,
          ...transferConfig,
        });
      await runtime.setProcessingState(
        'PROCESSING_COMPLETE',
        'Transfer Config Name was provided to the extension, and Transfer Config object was successfully written to Firestore.'
      );
    } else {
      // See if we have a transfer config in Firestore associated with this extension
      // If exists, update Transfer Config on BQ side and write updated object to Firestore
      // Otherwise, create Transfer Config on BQ side and write object to Firestore

      const q = db
        .collection(config.firestoreCollection)
        .where('extInstanceId', '==', config.instanceId);

      const results = await q.get();

      // TODO: Warning if multiple instances found
      if (results.size > 0) {
        const existingTransferConfig = results.docs[0].data();
        const transferConfigName = existingTransferConfig.name;
        const splitName = transferConfigName.split('/');
        const transferConfigId = splitName[splitName.length - 1];

        const response = await dts.updateTransferConfig(transferConfigName);

        if (response) {
          const updatedConfig = await dts.getTransferConfig(transferConfigName);

          if (!updatedConfig) {
            await runtime.setProcessingState(
              'PROCESSING_COMPLETE',
              'Transfer Config was updated, but the updated config could not be retrieved from BigQuery.'
            );
            return;
          }

          await db
            .collection(config.firestoreCollection)
            .doc(transferConfigId)
            .set({
              extInstanceId: config.instanceId,
              ...updatedConfig,
            });

          await runtime.setProcessingState(
            'PROCESSING_COMPLETE',
            'Transfer Config Name was not provided to the extension, and an existing Transfer Config found. Transfer Config object was successfully updated in BQ and Firestore.'
          );
          return;
        }

        await runtime.setProcessingState(
          'PROCESSING_COMPLETE',
          `An existing Transfer Config name found in ${config.firestoreCollection}, but the associated Transfer Config does not exist.`
        );

        return;
      } else {
        const transferConfig = await dts.createTransferConfig();
        const splitName = transferConfig.name.split('/');
        const transferConfigId = splitName[splitName.length - 1];

        await db
          .collection(config.firestoreCollection)
          .doc(transferConfigId)
          .set({
            extInstanceId: config.instanceId,
            ...transferConfig,
          });
        await runtime.setProcessingState(
          'PROCESSING_COMPLETE',
          'Transfer Config Name was not provided to the extension, and no existing Transfer Config found. Transfer Config object was successfully created in BQ and Firestore.'
        );
      }
    }
    return;
  });

export const processMessages = functions.pubsub
  .topic(config.pubSubTopic)
  .onPublish(async message => {
    logs.pubsubMessage(message);
    await helper.handleMessage(db, config, message);
    logs.pubsubMessageHandled(message);
  });

export const processMessagesHttp = functions.https.onRequest(
  async (req, res) => {
    const message = req.body as TransferRunMessage;
    await helper.handleMessage(db, config, message);
    res.send('OK');
  }
);
