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
// import {Discussion} from './discussion';
import {GenerateMessageOptions} from './types';
import {DocumentReference, FieldValue} from 'firebase-admin/firestore';
import {createErrorMessage} from './errors';
import {fetchDiscussionOptions, fetchHistory} from './firestore';
import {discussionClient} from './generative-client/chat';

const {
  // context,
  promptField,
  responseField,
  orderField,
  enableDiscussionOptionOverrides,
  collectionName,
  // temperature,
  // topP,
  // topK,
  candidateCount,
  candidatesField,
} = config;

// const bot = new Discussion({
//   context,
//   model: model,
//   temperature,
//   topP,
//   topK,
//   candidateCount,
// });

logs.init(config);

export const generateMessage = functions.firestore
  .document(collectionName)
  .onWrite(async change => {
    if (!change.after) {
      return; // do nothing on delete
    }

    const ref: DocumentReference = change.after.ref;
    const newPrompt = await change.after.get(promptField);

    const state = change.after.get('status.state');

    if (
      !newPrompt ||
      typeof newPrompt !== 'string' ||
      ['PROCESSING', 'COMPLETED', 'ERRORED'].includes(state)
    ) {
      // noop if the prompt is missing or not a string or if the document is already processing or completed.
      return;
    }

    // insert the order field for this document if it's missing and otherwise ready for processing
    if (!change.after.get(orderField)) {
      logs.missingField(orderField, ref.path);

      return ref.update({
        [orderField]: FieldValue.serverTimestamp(),
      });
    }

    await ref.update({
      status: {
        updateTime: FieldValue.serverTimestamp(),
        startTime: FieldValue.serverTimestamp(),
        state: 'PROCESSING',
      },
    });

    const history = await fetchHistory(ref);

    try {
      const t0 = performance.now();
      let requestOptions: GenerateMessageOptions = {history};

      if (enableDiscussionOptionOverrides) {
        const discussionOptions = await fetchDiscussionOptions(ref);

        requestOptions = {...requestOptions, ...discussionOptions};
      }
      const result = await discussionClient.send(newPrompt, requestOptions);

      const duration = performance.now() - t0;
      logs.receivedAPIResponse(ref.path, history.length, duration);

      const addCandidateField =
        candidatesField && candidateCount && candidateCount > 1;

      const completeData = addCandidateField
        ? {
            [responseField]: result.response,
            [candidatesField]: result.candidates,
            'status.state': 'COMPLETED',
            'status.completeTime': FieldValue.serverTimestamp(),
            'status.updateTime': FieldValue.serverTimestamp(),
            'status.error': null,
          }
        : {
            [responseField]: result.response,
            'status.state': 'COMPLETED',
            'status.completeTime': FieldValue.serverTimestamp(),
            'status.updateTime': FieldValue.serverTimestamp(),
            'status.error': null,
          };
      return ref.update(completeData);
    } catch (e: unknown) {
      // TODO: this error log needs to be more specific, not necessarily an API error here.
      logs.errorCallingGLMAPI(ref.path, e);

      const errorMessage = createErrorMessage(e);

      return ref.update({
        'status.state': 'ERRORED',
        'status.completeTime': FieldValue.serverTimestamp(),
        'status.updateTime': FieldValue.serverTimestamp(),
        'status.error': errorMessage,
      });
    }
  });
