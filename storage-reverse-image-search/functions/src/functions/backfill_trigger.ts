import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {getFunctions} from 'firebase-admin/functions';
import {getExtensions} from 'firebase-admin/extensions';

import config from '../config';
import * as utils from '../common/utils';
import {File} from '@google-cloud/storage';
import {BackfillStatus} from '../types/backfill_status';

export async function backfillTriggerHandler() {
  const runtime = getExtensions().runtime();

  // TODO make backfill optional

  const queue = getFunctions().taskQueue('backfillTask', config.instanceId);
  let writer = admin.firestore().batch();

  // Check if the bucket exists, if so, delete any files in it.
  // This might be a left-over from a previous installation.
  try {
    const bucket = admin.storage().bucket(config.bucketName);
    await bucket.deleteFiles({prefix: 'datapoints', autoPaginate: false});
  } catch (error) {
    functions.logger.error(error);
  }

  try {
    const objects = await utils.listImagesInBucket();

    if (objects.length === 0) {
      return runtime.setProcessingState(
        'PROCESSING_WARNING',
        'No images found in the bucket. You can start uploading images to the bucket to generate embeddings.'
      );
    }

    functions.logger.info(
      `Found ${objects.length} objects in path ${objects[0].parent.name} 📚`
    );

    let counter = 1;

    await admin.firestore().doc(config.tasksDoc).set({
      totalLength: objects.length,
      processedLength: 0,
      status: BackfillStatus.PENDING,
    });

    const chunks = utils.chunkArray<File>(objects, config.batchSize);

    for (const chunk of chunks) {
      const id = `ext-${config.instanceId}-task${counter}`;

      if (counter === 1) {
        // Enqueue the first task to be executed immediately.
        functions.logger.info(`Enqueuing the first task ${id} 🚀`);

        await queue.enqueue({
          id: id,
          bucket: config.imgBucket,
          objects: chunk.map(object => object.name),
        });
      }

      try {
        // Create a task document to track the progress of the task.
        writer.create(
          admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`),
          {
            taskId: id,
            status: BackfillStatus.PENDING,
            objects: chunk.map(object => object.name),
          }
        );

        if (
          counter % config.batchSize === 0 ||
          chunks.length < config.batchSize
        ) {
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
