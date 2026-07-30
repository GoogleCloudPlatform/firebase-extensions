/**
 * Copyright 2026 Google LLC
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

import config from './config';
import {Message, GenerateMessageOptions} from './types';
import {DocumentReference} from 'firebase-admin/firestore';
import {extractOverrides} from './overrides';

/** Utils for extracting conversation info from firestore */

const {promptField, responseField, orderField} = config;

export async function fetchHistory(ref: DocumentReference) {
  const collSnap = await ref.parent.orderBy(orderField).get();

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

export async function fetchDiscussionOptions(
  ref: DocumentReference
): Promise<GenerateMessageOptions> {
  const discussionDocRef = ref.parent.parent;

  if (!discussionDocRef) return {};

  const discussionDocSnap = await discussionDocRef.get();

  if (!discussionDocSnap.exists) return {};

  const overrides = extractOverrides(discussionDocSnap);

  if (discussionDocSnap.get('examples')) {
    const examples = discussionDocSnap.get('examples');
    const validatedExamples = validateExamples(examples);
    if (validatedExamples.length > 0) {
      overrides.examples = validatedExamples;
    }
  }

  if (discussionDocSnap.get('continue')) {
    const continueHistory = discussionDocSnap.get('continue');
    const validatedContinueHistory = validateExamples(continueHistory);
    if (validatedContinueHistory.length > 0) {
      overrides.examples = validatedContinueHistory;
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
      throw new Error(
        'Invalid examples or continue history: ' + JSON.stringify(example)
      );
    }
    validExamples.push(example);
  }
  return validExamples;
}
