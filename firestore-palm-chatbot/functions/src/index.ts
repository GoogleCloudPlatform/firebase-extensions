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
import {Discussion, GenerateMessageOptions, Message} from './discussion';
import {DocumentReference, FieldValue} from 'firebase-admin/firestore';
import {createErrorMessage} from './errors';

const {
  model,
  context,
  promptField,
  responseField,
  orderField,
  enableDiscussionOptionOverrides,
  collectionName,
  temperature,
  topP,
  topK,
  candidateCount,
  candidatesField,
} = config;

const bot = new Discussion({
  context,
  model: model,
  temperature,
  topP,
  topK,
  candidateCount,
});

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

        if (discussionOptions) {
          requestOptions = {...requestOptions, ...discussionOptions};
        }
      }

      const result = await bot.send(newPrompt, requestOptions);

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

async function fetchHistory(ref: DocumentReference) {
  const collSnap = await ref.parent.orderBy(orderField, 'desc').get();

  const refData = await ref.get();
  const refOrderFieldVal = refData.get(orderField);
  //filter any docs that don't have an order field or have an order field that is greater than the current doc

  return collSnap.docs
    .filter(
      snap => snap.get(orderField) && snap.get(orderField) < refOrderFieldVal
    )
    .map(snap => ({
      path: snap.ref.path,
      prompt: snap.get(promptField),
      response: snap.get(responseField),
    }));
}

async function fetchDiscussionOptions(
  ref: DocumentReference
): Promise<GenerateMessageOptions> {
  const discussionDocRef = ref.parent.parent;

  if (discussionDocRef === null) {
    return {};
  }
  const discussionDocSnap = await discussionDocRef.get();
  if (!discussionDocSnap.exists) {
    return {};
  }
  let overrides = {};

  for (const field of ['context', 'model', 'examples', 'continue']) {
    overrides = {...overrides, [field]: discussionDocSnap.get(field)};
  }

  for (const field of ['topK', 'candidateCount']) {
    const value = parseInt(discussionDocSnap.get(field));
    if (value && !Number.isNaN(value)) {
      overrides = {...overrides, [field]: value};
    }
  }

  for (const field of ['topP', 'temperature']) {
    const value = parseFloat(discussionDocSnap.get(field));
    if (value && !Number.isNaN(value)) {
      overrides = {...overrides, [field]: value};
    }
  }

  if (discussionDocSnap.get('examples')) {
    const examples = discussionDocSnap.get('examples');
    if (examples) {
      const validatedExamples = validateExamples(examples);
      if (validatedExamples.length > 0) {
        overrides = {...overrides, examples: validatedExamples};
      }
    }
  }
  return overrides;
}

function validateExamples(examples: Record<string, unknown>[]): Message[] {
  if (!Array.isArray(examples)) {
    throw new Error('Invalid examples: ' + JSON.stringify(examples));
  }
  const validExamples: Message[] = [];
  for (const example of examples) {
    // check obj has prompt or response
    const prompt = example.prompt;
    const response = example.response;
    if (typeof prompt !== 'string' || typeof response !== 'string') {
      throw new Error('Invalid example: ' + JSON.stringify(example));
    }
    validExamples.push(example);
  }
  return validExamples;
}
