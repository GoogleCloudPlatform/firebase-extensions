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

import * as google from 'googleapis';
import * as admin from 'firebase-admin';
import axios, {AxiosError} from 'axios';
import {GoogleAuth} from 'google-auth-library';
import * as functions from 'firebase-functions';
import {getFunctions} from 'firebase-admin/functions';

import config from '../config';
import {launchJob, RestoreStatus} from '../common';

const apiEndpoint = 'firestore.googleapis.com';

export const checkScheduledBackupStateHandler = async (data: any) => {
  const jobId = data?.jobId;
  functions.logger.info('An event has been recieved', data);

  const restoreRef = admin.firestore().doc(`${config.restoreDoc}/${jobId}`);
  const restoreData = await restoreRef.get();

  if (!restoreData || !restoreData.data()) {
    functions.logger.error('No restore data found');
    return;
  }

  const operation = restoreData.data()?.operation;
  if (!operation) return;

  try {
    const newOperation = await processOperation(operation);

    // Once the operation is complete, update the restore doc to trigger the next step
    await restoreRef.set(
      {
        status: {message: RestoreStatus.RUNNING_DATAFLOW},
        operation: newOperation,
      },
      {merge: true}
    );

    await launchJob(restoreData.data()!.timestamp);
  } catch (error: any) {
    functions.logger.error('Error processing operation', error);

    if (error.message === 'OPERATION_NOT_COMPLETE') {
      functions.logger.info(
        'Scheduling task to check operation again in 4 mins'
      );

      await getFunctions()
        .taskQueue(
          `locations/${config.location}/functions/checkScheduledBackupState`,
          config.instanceId
        )
        .enqueue(
          {
            jobId: jobId,
          },
          {scheduleDelaySeconds: 240}
        );
    }
  }
};

async function processOperation(
  operation: any
): Promise<google.firestore_v1.Schema$GoogleLongrunningOperation> {
  const _operation = await getOperationByName(operation.id);
  if (_operation?.error) {
    throw new Error(_operation.error?.message ?? 'Unknown error.');
  }

  functions.logger.info('Operation found', {_operation});

  if (_operation.done) {
    functions.logger.info('Operation complete');
    return _operation;
  }

  functions.logger.info('Operation not complete. Checking again in 4 mins');
  throw new Error('OPERATION_NOT_COMPLETE');
}

async function getOperationByName(
  operationName: string
): Promise<google.firestore_v1.Schema$GoogleLongrunningOperation> {
  const accessToken = await getAccessToken();
  try {
    const response = await axios.get(
      `https://${apiEndpoint}/v1beta1/${operationName}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    throw (error as AxiosError).response?.data;
  }
}

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

async function getAccessToken(): Promise<string | undefined> {
  const client = await auth.getClient();
  const _accessToken = await client.getAccessToken();
  return _accessToken.token ?? undefined;
}
