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

import {getFunctions} from 'firebase-admin/functions';
import config from './config';
import {ExportTask} from './types';
import {enqueueExportTask, ExportData, getRows} from './utils';

export async function exportChunkTaskHandler(data: {
  exportData: ExportData;
  task: ExportTask;
}) {
  const {exportData, task} = data;
  const {id, offset} = task;

  const query = exportData.getQuery(offset);

  const rows = await getRows(query);
  // log that we got the rows

  // we add these in parallel as it is faster
  await Promise.all(rows.map(exportData.outputCollection.add));

  // update the task document to mark it as complete
  await exportData.runDoc.update({
    status: 'COMPLETE',
  });

  const runDocSnap = await exportData.runDoc.get();
  const {totalLength, processedLength} = runDocSnap.data();
  const newProcessedLength = processedLength + rows.length;

  if (newProcessedLength === totalLength) {
    await exportData.runDoc.update({
      status: 'DONE',
    });
  } else {
    // queue next task
    await _createNextTask(exportData, {
      id: id,
      offset: offset,
    });
  }
}

const _createNextTask = async (
  exportData: ExportData,
  prevTask: ExportTask
) => {
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/backfillTask`,
    config.instanceId
  );

  const taskNum = prevTask.id.split('task')[1];
  const nextId = `ext-${config.instanceId}-task${parseInt(taskNum) + 1}`;

  const nextOffset = prevTask.offset + config.chunkSize;

  await enqueueExportTask(queue, exportData, {
    id: nextId,
    offset: nextOffset,
  });
};
