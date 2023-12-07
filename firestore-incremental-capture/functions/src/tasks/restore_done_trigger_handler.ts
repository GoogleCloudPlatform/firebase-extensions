import * as google from 'googleapis';
import * as admin from 'firebase-admin';
import axios, {AxiosError} from 'axios';
import {GoogleAuth} from 'google-auth-library';
import * as functionsv2 from 'firebase-functions/v2';

import config from '../config';
import {RestoreStatus} from '../models/restore_status';
import {launchJob} from '../dataflow/trigger_dataflow_job';

const apiEndpoint = 'firestore.googleapis.com';

export const restoreDoneTriggerConfig = {
  retry: false,
  eventType: 'google.cloud.audit.log.v1.written',
  serviceAccount: `ext-${config.instanceId}@${config.projectId}.iam.gserviceaccount.com`,
};

export const restoreDoneTriggerHandler = async (event: any) => {
  const operation = event.data?.operation;
  functionsv2.logger.info('An event has been recieved', event);

  if (!operation) return;

  try {
    if (operation && !operation.last) return;
    await processOperation(operation);

    // Once the operation is complete, update the restore doc to trigger the next step

    const snapshot = await admin
      .firestore()
      .collection(`_ext-${config.instanceId}/restore/jobs`)
      .where('operation.metdata.name', '==', operation.metadata.name)
      .limit(1)
      .get();

    if (snapshot.empty) throw new Error('No restore job found');

    const restoreDoc = snapshot.docs[0].ref.parent.parent!;
    await restoreDoc.set(
      {status: {message: RestoreStatus.RUNNING_DATAFLOW}, operation: operation},
      {merge: true}
    );

    // await launchJob(snapshot.docs[0].data().timestamp);
  } catch (error) {
    functionsv2.logger.error('Error processing operation', error);
  }
};

async function processOperation(operation: any) {
  const _operation = await getOperationByName(operation.id);
  if (_operation?.error) {
    throw new Error(_operation.error?.message ?? 'Unknown error.');
  }

  functionsv2.logger.info('Operation found', {_operation});

  const backupId = (operation.id as string).split('/operations/')[0];
  functionsv2.logger.info('Restoration done', {backupId});
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
