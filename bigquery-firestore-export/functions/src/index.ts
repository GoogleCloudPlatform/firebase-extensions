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
// import {onSchedule} from "firebase-functions/v2/scheduler";
import { onRequest } from 'firebase-functions/v1/https';
import * as logs from './logs';
import config from './config';
import { stageTemplate } from './cloudBuild';
import { launchJob } from './triggerDataFlow';

logs.init();

/**
 * Initializes Admin SDK & SMTP connection if not already initialized.
 */

admin.initializeApp({projectId: config.projectId});

export const stageDataFlowTemplate = functions.tasks.taskQueue().onDispatch(async () => {
  const operationName = await stageTemplate();
  console.log(`Operation name: ${JSON.stringify(operationName)}`)
  await admin.firestore().doc(config.cloudBuildDoc).set({status: "staging template"});
})

export const processMessages = functions.pubsub.topic('cloud-builds').onPublish(async (message,ctx) => {
  //  log the event
  console.log('build event received!');
  console.log(`Message: ${message.json}`);
  await admin.firestore().doc(config.cloudBuildDoc).update({status: "staged"});
});

export const httpTriggerDataFlow = onRequest(async (req, res) => {
  const cloudBuildDoc = await admin.firestore().doc(config.cloudBuildDoc).get();
  const status = cloudBuildDoc.data()?.status

  const query = req.body.query;

  if (!query) {
    res.status(400).send("Missing query parameter");
  }

  if (status === "staged") {
    await launchJob({query});
  }
});