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
import {getExtensions} from 'firebase-admin/extensions';
import {onSchedule} from "firebase-functions/v2/scheduler";

import * as logs from './logs';
import config from './config';
// import * as dts from './dts';
import { runConfigureDataFlow } from './runConfigureDataFlow';
import { triggerDataFlow } from './triggerDataFlow';
import { onRequest } from 'firebase-functions/v1/https';

logs.init();

/**
 * Initializes Admin SDK & SMTP connection if not already initialized.
 */

admin.initializeApp({projectId: config.projectId});

export const scheduledExport = onSchedule(config.scheduleInterval || "Every day", async (event) => {
  // Trigger dataflow pipeline
    await triggerDataFlow(event,"event")
});

export const httpTriggerExport = onRequest(async (req, res) => {
  // Trigger dataflow pipeline

  await triggerDataFlow(req,"http")
    res.status(200).send("OK")
});

export const configureDataFlow = async () => await runConfigureDataFlow();

