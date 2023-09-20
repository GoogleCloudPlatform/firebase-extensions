import config from '../config';
import {TemplatesServiceClient} from '@google-cloud/dataflow';
import * as admin from 'firebase-admin';
const dataflowClient = new TemplatesServiceClient();

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
        // dataset: config.bqDataset,
        // table: config.bqtable,
      },
    } as any,
  };

  const [response] = await dataflowClient.launchTemplate(request);

  await runDoc.set({status: 'export triggered', runId: runId});

  console.log(`Launched job ${response.job?.id}`);
  return response;
}
