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
import {parseTransferConfigName} from './helper';
import * as dts from './dts';
import {PARTITIONING_FIELD_REMOVAL_ERROR_PREFIX} from './dts';

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
      const {transferConfigId} = parseTransferConfigName(
        config.transferConfigName
      );

      // Ensure the latest transfer config object is stored in Firestore.
      // If Firestore already contains an extension instance matching this config ID, the extension
      // will overwrite the existing config with the latest config from the API
      let transferConfig;
      try {
        transferConfig = await dts.getTransferConfig(config.transferConfigName);
      } catch (error) {
        await runtime.setProcessingState(
          'PROCESSING_FAILED',
          `Failed to retrieve transfer config from BigQuery: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        throw error;
      }

      if (!transferConfig) {
        await runtime.setProcessingState(
          'PROCESSING_COMPLETE',
          'The specified scheduled query does not exist in BigQuery. Please verify the Transfer Config Name.'
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
        'Successfully linked to existing scheduled query and saved configuration to Firestore.'
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
        if (!existingTransferConfig?.name) {
          await runtime.setProcessingState(
            'PROCESSING_FAILED',
            `Existing transfer config document in ${config.firestoreCollection} is missing required 'name' field.`
          );
          throw new Error(
            'Existing transfer config document missing name field'
          );
        }
        const transferConfigName = existingTransferConfig.name;
        const {transferConfigId} = parseTransferConfigName(transferConfigName);

        try {
          // Note: serviceAccountName cannot be updated on existing transfer configs,
          // so we don't pass it here. It's only set at creation time.
          await dts.updateTransferConfig(transferConfigName);

          const updatedConfig = await dts.getTransferConfig(transferConfigName);

          if (!updatedConfig) {
            await runtime.setProcessingState(
              'PROCESSING_COMPLETE',
              'Scheduled query was updated, but could not retrieve the updated configuration from BigQuery.'
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
            'Successfully updated existing scheduled query in BigQuery and Firestore.'
          );
          return;
        } catch (error) {
          // Handle partitioning removal error specifically
          if (
            error instanceof Error &&
            error.message.includes(PARTITIONING_FIELD_REMOVAL_ERROR_PREFIX)
          ) {
            await runtime.setProcessingState(
              'PROCESSING_COMPLETE',
              error.message
            );
            return;
          }
          // Set processing state before re-throwing other errors
          await runtime.setProcessingState(
            'PROCESSING_FAILED',
            `Failed during transfer config update: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          throw error;
        }
      } else {
        try {
          // Construct extension service account email
          // Format: ext-{instanceId}@{projectId}.iam.gserviceaccount.com
          const serviceAccountEmail = `ext-${config.instanceId}@${config.projectId}.iam.gserviceaccount.com`;

          const transferConfig =
            await dts.createTransferConfig(serviceAccountEmail);
          // createTransferConfig guarantees name exists (throws if null)
          const {transferConfigId} = parseTransferConfigName(
            transferConfig.name!
          );

          await db
            .collection(config.firestoreCollection)
            .doc(transferConfigId)
            .set({
              extInstanceId: config.instanceId,
              ...transferConfig,
            });
          await runtime.setProcessingState(
            'PROCESSING_COMPLETE',
            'Successfully created new scheduled query in BigQuery and saved configuration to Firestore.'
          );
        } catch (error) {
          await runtime.setProcessingState(
            'PROCESSING_FAILED',
            `Failed to create transfer config: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          throw error;
        }
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
