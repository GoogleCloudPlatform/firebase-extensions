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
import {getFunctions} from 'firebase-admin/functions';
import config from './config';
import {enqueueExportTask, getRows} from './utils';

const db = admin.firestore();

export async function exportChunkTaskHandler({
  id,
  datasetId,
  tableName,
  offset,
  transferConfigId,
  runId,
}) {
  const query = `SELECT * FROM \`${config.projectId}.${datasetId}.${tableName}\` LIMIT ${config.chunkSize} OFFSET ${offset}`;
  const rows = await getRows(query);
  // log that we got the rows
  const runDocPath = `${config.firestoreCollection}/${transferConfigId}/runs/${runId}`;
  const outputCollection = db.collection(`${runDocPath}/output`);

  // we add these in parallel as it is faster
  await Promise.all(rows.map(outputCollection.add));

  // update the task document to mark it as complete
  await db.doc(`${runDocPath}/tasks/${id}`).update({
    status: 'COMPLETE',
  });

  const runDocSnap = await db.doc(runDocPath).get();
  const {totalLength, processedLength} = runDocSnap.data();
  const newProcessedLength = processedLength + rows.length;

  if (newProcessedLength === totalLength) {
    await admin.firestore().doc(runDocPath).update({
      status: 'DONE',
    });
  } else {
    // queue next task
    await _createNextTask({
      prevId: id,
      datasetId,
      tableName,
      offset: offset + config.chunkSize,
      transferConfigId,
      runId,
    });
  }
}

const _createNextTask = async ({
  prevId,
  datasetId,
  transferConfigId,
  runId,
  tableName,
  offset,
}) => {
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/backfillTask`,
    config.instanceId
  );

  const taskNum = prevId.split('task')[1];
  const id = `ext-${config.instanceId}-task${parseInt(taskNum) + 1}`;

  await enqueueExportTask(queue, {
    id,
    datasetId,
    transferConfigId,
    runId,
    tableName,
    offset,
  });
};
