/**
 * Copyright 2019 Google LLC
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

import config from './config';
import {logger} from 'firebase-functions';
import {pubsub} from 'firebase-functions';

export const obfuscatedConfig = Object.assign({}, config, {
  smtpConnectionUri: '<omitted>',
  smtpPassword: '<omitted>',
});

export function init() {
  logger.log('Initializing extension with configuration', obfuscatedConfig);
}

export function start() {
  logger.log(
    'Started execution of extension with configuration',
    obfuscatedConfig
  );
}

export function errorWritingToFirestore(err: Error) {
  logger.error('Error writing to Firestore:', err);
}

export function error(err: Error) {
  logger.error('Unhandled error occurred during processing:', err);
}

export function complete() {
  logger.log('Completed execution of extension');
}

export function bigqueryJobStarted(jobId: string) {
  logger.log(`Job ${jobId} started.`);
}

export function createTransferConfig() {
  logger.log('Creating a new transfer config.');
}

export function transferConfigCreated(transferConfigName: string) {
  logger.log(
    `Successfully created a new transfer config with name '${transferConfigName}'.`
  );
}

export function updateTransferConfig(transferConfigName: string) {
  logger.log(`Updating transfer config '${transferConfigName}'.`);
}

export function transferConfigUpdated(transferConfigName: string) {
  logger.log(`Successfully updated transfer config '${transferConfigName}'.`);
}

export function writeRunResultsToFirestore(runId: string) {
  logger.log(`Writing query output from run '${runId}' to Firestore.`);
}

export function runResultsWrittenToFirestore(
  runId: string,
  successCount: Number,
  totalCount: Number
) {
  logger.log(
    `Finished writing query output from run '${runId}' to Firestore. ${successCount}/${totalCount} rows written successfully.`
  );
}

export function bigqueryResultsRowCount(
  transferConfigId: string,
  runId: string,
  count: Number
) {
  logger.log(
    `Destination table for transfer config '${transferConfigId}' and transfer run '${runId}' contained rows.`
  );
}

export function pubsubMessage(message: pubsub.Message) {
  logger.log(
    `Transfer run complete. Handling pubsub message: ${JSON.stringify(
      message,
      null,
      2
    )}`
  );
}

export function pubsubMessageHandled(message: pubsub.Message) {
  logger.log(
    `Pubsub message successfully handled: ${JSON.stringify(message, null, 2)}`
  );
}
