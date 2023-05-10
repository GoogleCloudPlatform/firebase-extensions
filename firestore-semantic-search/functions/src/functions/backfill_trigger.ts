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
import {getExtensions} from 'firebase-admin/extensions';

import config from '../config';
import * as utils from '../common/utils';
import {BackfillStatus} from '../types/backfill_status';

const batchSize = config.embeddingMethod === 'palm' ? 50 : 500;

export async function backfillTriggerHandler(forceCreateIndex = false) {
  const runtime = getExtensions().runtime();

  if (!forceCreateIndex && !config.doBackfill) {
    return runtime.setProcessingState(
      'PROCESSING_WARNING',
      `Backfill is disabled, index setup will start with the first write operation to the collection ${config.collectionName}.`
    );
  }

  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/backfillTask`,
    config.instanceId
  );
  let writer = admin.firestore().batch();

  // Check if the backfill bucket exists, if so, delete any files in it.
  // This might be a left-over from a previous installation.
  try {
    const bucket = admin.storage().bucket(config.bucketName);
    await bucket.deleteFiles({prefix: 'datapoints', autoPaginate: false});
  } catch (error) {
    // Ignore the error if the bucket doesn't exist.
    functions.logger.debug(error);
  }

  try {
    const collection = admin.firestore().collection(config.collectionName);

    const refs = await collection.listDocuments();

    if (refs.length === 0) {
      return runtime.setProcessingState(
        'PROCESSING_WARNING',
        'No documents found in the collection.'
      );
    }

    functions.logger.info(
      `Found ${refs.length} documents in the collection ${config.collectionName} 📚`
    );

    let counter = 1;

    await admin.firestore().doc(config.tasksDoc).set({
      totalLength: refs.length,
      processedLength: 0,
      status: BackfillStatus.PENDING,
    });

    const chunks = utils.chunkArray(refs, batchSize);

    for (const chunk of chunks) {
      const id = `ext-${config.instanceId}-task${counter}`;

      if (counter === 1) {
        // Enqueue the first task to be executed immediately.
        functions.logger.info(`Enqueuing the first task ${id} 🚀`);

        await queue.enqueue({
          id: id,
          collectionName: config.collectionName,
          documentIds: chunk.map(ref => ref.id),
        });
      }

      try {
        // Create a task document to track the progress of the task.
        writer.create(
          admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`),
          {
            taskId: id,
            status: BackfillStatus.PENDING,
            documentIds: chunk.map(ref => ref.id),
          }
        );

        if (counter % batchSize === 0 || chunks.length < batchSize) {
          functions.logger.info('Committing the batch...');

          await writer.commit();
          writer = admin.firestore().batch();
        }
      } catch (error) {
        functions.logger.error(error);
        await runtime.setProcessingState(
          'PROCESSING_FAILED',
          'Failed to generate embeddings, for more details check the logs.'
        );

        throw error;
      }

      counter++;
    }

    functions.logger.info(`${counter} tasks enqueued successfully 🚀`);

    return runtime.setProcessingState(
      'PROCESSING_COMPLETE',
      'Successfully enqueued all tasks to backfill the data.'
    );
  } catch (error) {
    functions.logger.error(error);
    await runtime.setProcessingState(
      'PROCESSING_FAILED',
      'Failed to generate embeddings, for more details check the logs.'
    );

    throw error;
  }
}
