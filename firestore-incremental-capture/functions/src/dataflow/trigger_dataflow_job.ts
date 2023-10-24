import * as admin from 'firebase-admin';
import {logger} from 'firebase-functions/v1';
import {FlexTemplatesServiceClient} from '@google-cloud/dataflow';
// Cloud Firestore
import {Timestamp} from 'firebase-admin/firestore';

import config from '../config';

const dataflowClient = new FlexTemplatesServiceClient();

export async function launchJob(timestamp: number) {
  const projectId = config.projectId;
  const serverTimestamp = Timestamp.now().toMillis();

  const runId = `${config.instanceId}-dataflow-run-${serverTimestamp}`;

  logger.info(`Launching job ${runId}`, {
    labels: {run_id: runId},
  });

  const runDoc = admin.firestore().doc(`restore/${runId}`);

  const [response] = await dataflowClient.launchFlexTemplate({
    projectId,
    location: config.location,
    launchParameter: {
      jobName: runId,
      launchOptions: {
        timestamp: timestamp.toString(),
        firestoreCollectionId: config.syncCollectionPath,
        firestoreDb:
          config.backupInstanceName.split('/').length > 1
            ? config.backupInstanceName.split('/')[1]
            : config.backupInstanceName,
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
