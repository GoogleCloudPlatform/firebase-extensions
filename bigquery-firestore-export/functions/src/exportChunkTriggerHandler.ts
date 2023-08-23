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
import {getFunctions, TaskQueue} from 'firebase-admin/functions';
import {getExtensions} from 'firebase-admin/extensions';
import config from './config';
import {enqueueExportTask, getRows, getTableLength} from './utils';

export async function exportChunkTriggerHandler({
  transferConfigId,
  runId,
  datasetId,
  tableName,
}: {
  transferConfigId: string;
  runId: string;
  datasetId: string;
  tableName: string;
}) {
  const runtime = getExtensions().runtime();

  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/backfillTask`,
    config.instanceId
  );

  let writer = admin.firestore().batch();
  try {
    // const collection = admin.firestore().collection(config.collectionName);

    // const refs = document ? [document.ref] : await collection.listDocuments();
    const rowCount = await getTableLength(
      config.projectId,
      datasetId,
      tableName
    );

    if (rowCount === 0) {
      return runtime.setProcessingState(
        'PROCESSING_WARNING',
        'No rows found in bigquery table.'
      );
    }

    functions.logger.info(
      `Found ${rowCount} documents in the bigquery table ${tableName}`
    );

    const runDoc = `${config.firestoreCollection}/${transferConfigId}/runs/${runId}`;

    await admin.firestore().doc(runDoc).set({
      totalLength: rowCount,
      processedLength: 0,
      status: 'PENDING',
    });

    let counter = 1;
    const chunkCount = Math.ceil(rowCount / config.chunkSize);

    // batch-write metadata to firestore
    for (let i = 0; i < rowCount; i += config.chunkSize) {
      const id = `ext-${config.instanceId}-task${counter}`;

      try {
        // Create a task document to track the progress of the task.
        writer.set(admin.firestore().doc(`${runDoc}/tasks/${id}`), {
          taskId: id,
          status: 'PENDING',
          offset: i,
        });
        // commit a batch of metadata to firestore every batchSize tasks
        if (counter % config.batchSize === 0 || counter === chunkCount) {
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

      if (counter === 1) {
        // Enqueue first task to start the process
        functions.logger.info(`Enqueuing the first task ${id} 🚀`);

        await enqueueExportTask(queue, {
          id,
          datasetId,
          transferConfigId,
          runId,
          tableName,
          offset: i,
        });
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
      'Failed to queue all tasks, for more details check the logs.'
    );

    throw error;
  }
}
