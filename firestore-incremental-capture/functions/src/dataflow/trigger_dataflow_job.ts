import * as admin from 'firebase-admin';
import {logger} from 'firebase-functions/v1';
import {FlexTemplatesServiceClient} from '@google-cloud/dataflow';

import config from '../config';

const dataflowClient = new FlexTemplatesServiceClient();

export async function launchJob() {
  const projectId = config.projectId;
  const runId = `${config.instanceId}-dataflow-run-${Date.now()}`;

  const runDoc = admin.firestore().doc(`restore/${runId}`);

  const request = {
    projectId,
    gcsPath: config.templateLocation,
    launchParameters: {
      jobName: runId,
      parameters: {
        dataset: config.bqDataset,
        table: config.bqtable,
      },
    },
  };

  const [response] = await dataflowClient.launchFlexTemplate(request);

  await runDoc.set({status: 'export triggered', runId: runId});

  logger.log(`Launched job ${response.job?.id}`);

  return response;
}
