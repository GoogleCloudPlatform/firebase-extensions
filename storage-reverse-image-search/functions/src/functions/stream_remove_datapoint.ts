/**
 * Copyright 2023 Google LLC
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
import * as functions from 'firebase-functions';
import {getFunctions} from 'firebase-admin/functions';

import config from '../config';
import {AxiosError} from 'axios';
import * as utils from '../common/utils';
import {IndexStatus} from '../types/index_status';
import {checkIndexStatus, removeDatapoint} from '../common/vertex';

export async function streamRemoveDatapointHandler(
  object: functions.storage.ObjectMetadata
) {
  const doc = await checkIndexStatus();
  const {status, index} = doc || {};

  if (
    (index && status !== IndexStatus.DEPLOYED) ||
    status === IndexStatus.BUILDING
  ) {
    functions.logger.info('Index not deployed yet, skipping...');
    const queue = getFunctions().taskQueue(
      'datapointWriteTask',
      config.instanceId
    );

    // Index isn't ready yet, retry in an hour.
    await queue.enqueue(
      {
        operation: 'remove',
        imagePath: object.name,
      },
      {
        scheduleDelaySeconds: 60 * 60,
      }
    );
    return;
  }

  if (!object.name) return;
  if (!utils.isImage(object.name)) {
    functions.logger.info(`Skipping ${object.name}, not an image...`);
    return;
  }

  functions.logger.info(`Processing ${object.name}...`);

  const imagePath = object.name;

  functions.logger.info(`Deleting ${imagePath}`);

  try {
    // Get the index name from the metadata document.
    const metdata = await admin.firestore().doc(config.metadataDoc).get();
    const index = metdata.data()?.index;
    if (!index) {
      functions.logger.error('Index not found');
      return;
    }

    // Remove a datapoint from the index by its ID.
    await removeDatapoint(index, [imagePath]);
  } catch (error) {
    functions.logger.error((error as AxiosError).response);
  }
}
