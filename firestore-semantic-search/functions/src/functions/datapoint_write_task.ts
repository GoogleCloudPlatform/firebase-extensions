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
import {IndexStatus} from '../types/index_status';
import {
  checkIndexStatus,
  upsertDatapoint,
  removeDatapoint,
} from '../common/vertex';
import {getDatapoint} from '../common/datapoints';

export async function datapointWriteTaskHandler(data: any) {
  const {operation, docId} = data as {
    operation: 'update' | 'remove';
    docId: string;
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
        await removeDatapoint(index, [docId]);
        break;
      case 'update':
        {
          const snap = await admin
            .firestore()
            .doc(`${config.collectionName}/${docId}`)
            .get();

          const data = snap.data();

          if (!data) return;
          if (Object.keys(data).length === 0) return;

          const datapoint = await getDatapoint(snap.ref, data);
          if (!datapoint) {
            functions.logger.info('No datapoint found, skipping...');
            return;
          }

          functions.logger.info('Datapoint generated 🎉');

          // Upsert the datapoint to the index.
          await upsertDatapoint(index, [
            {
              datapoint_id: datapoint.id,
              feature_vector: datapoint.embedding,
            },
          ]);
        }
        break;
    }
  } catch (error) {
    functions.logger.error((error as AxiosError).response);
  }
}
