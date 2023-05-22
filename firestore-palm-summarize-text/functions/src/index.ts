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

import * as functions from 'firebase-functions';
import * as logs from './logs';
import config from './config';
import {TextGenerator, TextGeneratorRequestOptions} from './generator';
import {DocumentReference, FieldValue} from 'firebase-admin/firestore';

const {textField, responseField, collectionName, targetSummaryLength} = config;

const MODEL = 'models/text-bison-001';

const textGenerator = new TextGenerator({
  model: MODEL,
});

logs.init(config);

export const generateSummary = functions.firestore
  .document(collectionName)
  .onWrite(async change => {
    if (!change.after) {
      return; // do nothing on delete
    }

    const ref: DocumentReference = change.after.ref;

    const text = change.after.get(textField);

    // only make an API call if text exists and is non-empty, response is missing, and there's no in-process status
    if (
      !text ||
      typeof text !== 'string' ||
      change.after.get(responseField) ||
      !isRegenerate(change)
    ) {
      return;
    }

    await ref.update({
      status: {
        updateTime: FieldValue.serverTimestamp(),
        startTime: FieldValue.serverTimestamp(),
        state: 'PROCESSING',
      },
    });

    try {
      const t0 = performance.now();
      const requestOptions: TextGeneratorRequestOptions = {};

      const prompt = createSummaryPrompt(text, targetSummaryLength);

      const result = await textGenerator.generate(prompt, requestOptions);

      const duration = performance.now() - t0;
      logs.receivedAPIResponse(ref.path, duration);

      return ref.update({
        [responseField]: result.candidates[0],
        'status.state': 'COMPLETED',
        'status.completeTime': FieldValue.serverTimestamp(),
        'status.updateTime': FieldValue.serverTimestamp(),
        'status.error': null,
      });
    } catch (e: any) {
      // TODO: this error log needs to be more specific, not necessarily an API error here.
      logs.errorCallingGLMAPI(ref.path, e);
      return ref.update({
        'status.state': 'ERRORED',
        'status.completeTime': FieldValue.serverTimestamp(),
        'status.updateTime': FieldValue.serverTimestamp(),
        'status.error':
          // TODO: Probably have better errors here but still don't leak underlying error.
          'An error occurred while processing the provided message.',
      });
    }
  });

const createSummaryPrompt = (text: string, targetSummaryLength?: number) => {
  if (!targetSummaryLength) {
    return `Summarize this text: "${text}"`;
  }
  return `Summarize this text in exactly ${targetSummaryLength} sentences: "${text}"`;
};

const isRegenerate = (
  change: functions.Change<functions.firestore.DocumentSnapshot>
): boolean => {
  const statusBefore = change.before.get('status');
  const status = change.after.get('status');
  return (
    statusBefore &&
    status &&
    statusBefore.state === 'COMPLETED' &&
    status.state === 'REGENERATE'
  );
};
