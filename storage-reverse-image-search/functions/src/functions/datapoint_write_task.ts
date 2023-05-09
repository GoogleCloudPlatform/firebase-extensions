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
import {AxiosError} from 'axios';

import config from '../config';
import * as utils from '../common/utils';
import {IndexStatus} from '../types/index_status';
import {getFeatureVectors} from '../common/feature_vectors';
import {
  checkIndexStatus,
  upsertDatapoint,
  removeDatapoint,
} from '../common/vertex';

export async function datapointWriteTaskHandler(data: any) {
  const {operation, imagePath} = data as {
    operation: 'update' | 'remove';
    imagePath: string;
  };

  const queue = getFunctions().taskQueue(
    'datapointWriteTask',
    config.instanceId
  );

  const indexStatus = await checkIndexStatus();
  if (indexStatus !== IndexStatus.DEPLOYED) {
    functions.logger.info('Index not deployed yet, skipping...');

    // Index isn't ready yet, retry in an hour.
    await queue.enqueue(data, {
      scheduleDelaySeconds: 60 * 60,
    });
    return;
  }

  try {
    // Get the index name from the metadata document.
    const metdata = await admin.firestore().doc(config.metadataDoc).get();
    const index = metdata.data()?.index;
    if (!index) {
      functions.logger.error('Index not found');
      return;
    }

    switch (operation) {
      case 'remove':
        // Upsert the datapoint to the index.
        await removeDatapoint(index, [imagePath]);
        break;
      case 'update':
        {
          const [object] = await admin
            .storage()
            .bucket(config.imgBucket)
            .file(imagePath)
            .getMetadata();

          if (!object.name) return;
          if (!utils.isImage(object.name)) {
            functions.logger.info(`Skipping ${object.name}, not an image...`);
            return;
          }

          const vector = await getFeatureVectors([imagePath]);
          if (!vector) {
            functions.logger.info('No feature vectors found, skipping...');
            return;
          }

          functions.logger.info('Datapoint generated 🎉');
          // Upsert the datapoint to the index.
          await upsertDatapoint(index, [
            {
              datapoint_id: object.name,
              feature_vector: vector[0],
            },
          ]);
        }
        break;
    }
  } catch (error) {
    functions.logger.error((error as AxiosError).response);
  }
}
