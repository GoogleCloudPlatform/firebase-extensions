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

import config from '../config';
import {RestoreStatus, ScheduledBackups} from '../common';
import {MetricsV1Beta3Client, protos} from '@google-cloud/dataflow';

const ExecutionState = protos.google.dataflow.v1beta3.ExecutionState;

const scheduledBackups = new ScheduledBackups();
const metrics = new MetricsV1Beta3Client();

export const checkDataflowJobStateHandler = async (data: any) => {
  const jobId = data?.jobId;

  functions.logger.info('A dataflow event has been recieved', data);
  const restoreRef = admin.firestore().doc(`${config.jobsCollection}/${jobId}`);

  try {
    // Get the dataflow job details
    const jobStatusResult = await metrics.getJobExecutionDetails({
      projectId: config.projectId,
      location: config.location,
      jobId: jobId,
    });

    // Get the state of the last dataflow stage
    const jobState = jobStatusResult[0][jobStatusResult[0].length - 1].state;

    // Update the job doc based on the job state
    switch (jobState) {
      case ExecutionState.EXECUTION_STATE_SUCCEEDED:
        await scheduledBackups.updateRestoreJobDoc(restoreRef, {
          status: {message: RestoreStatus.COMPLETED},
        });
        break;
      case ExecutionState.EXECUTION_STATE_FAILED:
      case ExecutionState.EXECUTION_STATE_CANCELLED:
        await scheduledBackups.updateRestoreJobDoc(restoreRef, {
          status: {message: RestoreStatus.FAILED},
        });
      default:
        functions.logger.info('Dataflow job still running');
        await scheduledBackups.enqueueCheckDataflowStatus(data.jobId);
    }
  } catch (error: any) {
    functions.logger.error('Error processing dataflow job', error);
    await scheduledBackups.updateRestoreJobDoc(restoreRef, {
      status: {message: RestoreStatus.FAILED, error: error.message},
    });
  }
};
