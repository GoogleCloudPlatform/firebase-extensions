/**
 * Copyright 2019 Google LLC
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
// import {getExtensions} from 'firebase-admin/extensions';
import {onSchedule} from 'firebase-functions/v2/scheduler';
import {onRequest} from 'firebase-functions/v1/https';
import * as logs from './logs';
import config from './config';
import {stageTemplate} from './cloudBuild';
import {launchJob} from './triggerDataFlow';
import {onCustomEventPublished} from 'firebase-functions/v2/eventarc';

logs.init();

/**
 * Initializes Admin SDK & SMTP connection if not already initialized.
 */

admin.initializeApp({projectId: config.projectId});

export const stageDataFlowTemplate = functions.tasks
  .taskQueue()
  .onDispatch(async () => {
    const operation = await stageTemplate();

    //TODO: get build id from operation
    await admin
      .firestore()
      .doc(config.cloudBuildDoc)
      .set({status: 'staging template'});
  });

export const processMessages = functions.pubsub
  .topic('cloud-builds')
  .onPublish(async (message, ctx) => {
    //  log the event
    console.log('build event received!');
    console.log(`Message: ${JSON.stringify(message)}`);
    const attributes = message.attributes;
    const status = attributes?.status;
    const buildId = attributes?.buildId;
    //TODO: validate buildId is for this extension
    if (status === 'SUCCESS' && buildId) {
      await admin
        .firestore()
        .doc(config.cloudBuildDoc)
        .update({status: 'staged'});
    }
  });

export const httpTriggerDataFlow = onRequest(async (_req, res) => {
  const cloudBuildDoc = await admin.firestore().doc(config.cloudBuildDoc).get();
  const status = cloudBuildDoc.data()?.status;

  if (status === 'staged') {
    try {
      const response = await launchJob();

      res.status(200).send(`Launched job ${response.job?.id}`);
    } catch (err) {
      console.log(`Error launching job: ${err}`);
      res.status(500).send(`Error launching job: ${err}`);
    }
  } else {
    res.status(404).send('Template not staged');
  }
});

export const scheduledTriggerFlow = onSchedule(config.schedule, async () => {
  const cloudBuildDoc = await admin.firestore().doc(config.cloudBuildDoc).get();
  const status = cloudBuildDoc.data()?.status;

  if (status === 'staged') {
    try {
      await launchJob();
      console.log('Job launched');
    } catch (err) {
      console.log(`Error launching job: ${err}`);
    }
  } else {
    console.log('Template not staged, try again later');
  }
});

export const onDataFlowStatusChange = onCustomEventPublished<Record<string,any>>(
  'google.cloud.dataflow.job.v1beta3.statusChanged',
  async event => {
    console.log(
      'dataflow status change event received!',
      JSON.stringify(event)
    );
    // @ts-ignore
    const job = event.job as string;
    const currentState = event.data?.payload?.currentState as string;
    const runId = job

    const runDoc = admin.firestore().doc(`${config.firestoreCollection}/${runId}`);

    if (currentState === 'JOB_STATE_DONE') {
      await runDoc.update({status: 'COMPLETE'});
    }
  }
);
