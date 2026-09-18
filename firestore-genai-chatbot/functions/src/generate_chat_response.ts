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
import {wantsMultipleCandidates} from './candidates';
import {GenerateMessageOptions} from './types';
import {fetchDiscussionOptions, fetchHistory} from './firestore';
import {getGenerativeClient} from './generative-client';
import {DocumentSnapshot} from 'firebase-functions/v1/firestore';

/**
 * Takes a prompt, calls the llm, returns the update object (with or without candidates accordingly).
 *
 **/
export const generateChatResponse = async (
  prompt: string,
  after: DocumentSnapshot
) => {
  const ref = after.ref;
  const history = await fetchHistory(ref);

  let requestOptions: GenerateMessageOptions = {
    history,
    context: config.context,
    maxOutputTokens: config.maxOutputTokens,
    safetySettings: config.safetySettings || [],
  };

  if (config.enableDiscussionOptionOverrides) {
    const discussionOptions = await fetchDiscussionOptions(ref);
    requestOptions = {...requestOptions, ...discussionOptions};
  }

  const discussionClient = getGenerativeClient();
  const result = await discussionClient.send(prompt, requestOptions);

  return shouldAddCandidatesField
    ? {
        [config.responseField]: result.response!,
        [config.candidatesField!]: result.candidates!,
      }
    : {
        [config.responseField]: result.response,
      };
};

const shouldAddCandidatesField = wantsMultipleCandidates(config);
