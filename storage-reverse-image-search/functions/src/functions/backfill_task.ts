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
import * as utils from '../common/utils';

import {BackfillStatus} from '../types/backfill_status';
import {getFeatureVectors} from '../common/feature_vectors';

export async function backfillEmbeddingsTaskHandler(data: any) {
  const {id, objects} = data;

  const taskRef = admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`);

  await taskRef.update({
    status: BackfillStatus.PROCESSING,
  });

  const datapoints: any = [];

  const featureVectors = await getFeatureVectors(objects);

  if (featureVectors) {
    for (let i = 0; i < featureVectors.length; i++) {
      datapoints.push({
        id: objects[i],
        embedding: featureVectors[i],
      });
    }
  }

  if (datapoints.length === 0) {
    functions.logger.info('No datapoints found, skipping...');
    return;
  }

  const outputShape = featureVectors[0].length;

  const localFilePath = await utils.saveEmbeddingsToTmpFile(datapoints);

  const destinationPath = `datapoints/${id}.json`;

  functions.logger.info(
    `Embeddings will be saved to ${destinationPath} 📝, uploading to the bucket...`
  );

  await utils.uploadToCloudStorage(localFilePath, destinationPath);

  functions.logger.info(
    `Embeddings uploaded to the bucket ${config.bucketName} in ${destinationPath} 🚀`
  );

  await taskRef.update({
    status: 'DONE',
    filePath: `gs://${config.bucketName}/${destinationPath}`,
  });

  await utils.deleteTempFiles();

  const tasksDoc = await admin.firestore().doc(config.tasksDoc).get();
  const {totalLength} = tasksDoc.data() as any;
  let {processedLength} = tasksDoc.data() as any;

  processedLength += objects.length;
  await admin
    .firestore()
    .doc(config.tasksDoc)
    .update({
      processedLength: admin.firestore.FieldValue.increment(objects.length),
    });

  if (processedLength === totalLength) {
    // Update the metadata doc with the output shape to be used in the index creation.
    await admin.firestore().doc(config.metadataDoc).set(
      {
        outputShape,
      },
      {merge: true}
    );

    await admin.firestore().doc(config.tasksDoc).update({
      status: BackfillStatus.DONE,
    });
  } else {
    await _createNextTask(id);
  }
}

async function _createNextTask(prevId: string) {
  const taskNum = prevId.split('task')[1];
  const nextId = `ext-${config.instanceId}-task${parseInt(taskNum) + 1}`;

  functions.logger.info(`Enqueuing the next task ${nextId}`);

  const nextTask = await admin
    .firestore()
    .doc(`${config.tasksDoc}/enqueues/${nextId}`)
    .get();

  const queue = getFunctions().taskQueue('backfillTask', config.instanceId);
  const data = nextTask.data();

  if (!nextTask.exists) {
    functions.logger.error(`Task ${nextId} does not exist`);
    return;
  }

  if (!data || !data.objects) {
    functions.logger.error(`Task ${nextId} has no objects`);
    return;
  }

  // Enqueue the next batch of objects
  await queue.enqueue({
    id: nextId,
    bucket: config.bucketName,
    objects: data.objects,
  });
}
