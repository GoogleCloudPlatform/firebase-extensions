import * as admin from 'firebase-admin';
import {logger} from 'firebase-functions/v1';
import {FlexTemplatesServiceClient} from '@google-cloud/dataflow';
import {Timestamp} from 'firebase-admin/firestore';

import config from '../config';

const dataflowClient = new FlexTemplatesServiceClient();

export async function launchJob(timestamp: number) {
  const projectId = config.projectId;
  const serverTimestamp = Timestamp.now().toMillis();
  const {syncCollectionPath} = config;

  const runId = `${config.instanceId}-dataflow-run-${serverTimestamp}`;

  logger.info(`Launching job ${runId}`, {
    labels: {run_id: runId},
  });

  const runDoc = admin.firestore().doc(`restore/${runId}`);

  // Extract the database name from the backup instance name
  const values = config.backupInstanceName.split('/');
  const firestoreDb = values[values.length - 1];

  /** Select the correct collection Id for apache beam */
  const firestoreCollectionId =
    syncCollectionPath === '{document=**}' ? '*' : syncCollectionPath;

  const [response] = await dataflowClient.launchFlexTemplate({
    projectId,
    location: config.location,
    launchParameter: {
      jobName: runId,
      parameters: {
        timestamp: timestamp.toString(),
        firestoreCollectionId,
        firestoreDb,
        bigQueryDataset: config.bqDataset,
        bigQueryTable: config.bqtable,
      },
      containerSpecGcsPath: `gs://${config.bucketName}/${config.instanceId}-dataflow-restore`,
    },
  });

  await runDoc.set({status: 'export triggered', runId: runId});

  logger.info(`Launched job named ${response.job?.name} successfully`, {
    job_response: response,
    labels: {run_id: runId},
  });

  return response;
}
