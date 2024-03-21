/**
 * Copyright 2023 Google LLC
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
import {DocumentReference, FieldValue} from 'firebase-admin/firestore';
import * as Mustache from 'mustache';
import * as admin from 'firebase-admin';

admin.initializeApp();

import {
  createErrorMessage,
  missingVariableError,
  variableTypeError,
} from './errors';

const {prompt, responseField, collectionName} = config;

import {getGenerativeClient, GenerativeResponse} from './generative-client';
import {extractHandlebarsVariables} from './utils';
import {throwInvalidArgumentError, throwUnauthenticatedError} from './errors';

export const generateText = functions.firestore
  .document(collectionName)
  .onWrite(async change => {
    if (!change.after) {
      return; // do nothing on delete
    }

    const ref: DocumentReference = change.after.ref;

    const data = change.after.data();

    if (!data) {
      // TODO add logging
      return;
    }

    const status = data.status || {};

    const state = status.state;
    const response = data[responseField];

    // only make an API call if prompt exists and is non-empty, response is missing, and there's no in-process status
    if (
      !prompt ||
      response ||
      ['PROCESSING', 'COMPLETED', 'ERRORED'].includes(state)
    ) {
      // TODO add logging
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
      // if prompt contains handlebars for variable substitution, do it:
      const substitutedPrompt = getSubstitutedPrompt(data, prompt);

      const t0 = performance.now();
      let requestOptions = {};
      if (config.googleAi.model === 'gemini-pro-vision') {
        requestOptions = {
          ...requestOptions,
          image: data[config.imageField],
          safetySettings: config.safetySettings,
        };
      }

      const generativeClient = getGenerativeClient();
      const result = await generativeClient.generate(
        substitutedPrompt,
        requestOptions
      );

      const duration = performance.now() - t0;
      logs.receivedAPIResponse(ref.path, duration);

      const metadata: Record<string, any> = {
        'status.completeTime': FieldValue.serverTimestamp(),
        'status.updateTime': FieldValue.serverTimestamp(),
      };

      if (result.safetyMetadata) {
        metadata.safetyMetadata = {};

        /** Ensure only defined data is added to the metadata */
        for (const key of Object.keys(result.safetyMetadata)) {
          if (result.safetyMetadata[key] !== undefined) {
            metadata.safetyMetadata[key] = result.safetyMetadata[key];
          }
        }
      }

      if (config.candidates.shouldIncludeCandidatesField) {
        return ref.update({
          ...metadata,
          [responseField]: result.candidates[0],
          [config.candidates.field]: result.candidates,
          'status.error': null,
        });
      }
      return ref.update({
        ...metadata,
        [responseField]: result.candidates[0],
        'status.state': 'COMPLETED',
      });
    } catch (e: any) {
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

export const generateOnCall = functions.https.onCall(async (data, context) => {
  if (!context.auth) throwUnauthenticatedError();
  if (typeof data !== 'object') throwInvalidArgumentError();

  const {image, safetySettings} = data;

  const substitutedPrompt = getSubstitutedPrompt(data, prompt);

  let requestOptions = {};
  if (config.googleAi.model === 'gemini-pro-vision') {
    requestOptions = {
      ...requestOptions,
      image,
      safetySettings: safetySettings || config.safetySettings,
    };
  }

  const generativeClient = getGenerativeClient();

  const result = await generativeClient.generate(
    substitutedPrompt,
    requestOptions
  );

  const metadata = extractMetadata(result);

  if (config.candidates.shouldIncludeCandidatesField) {
    return {
      ...metadata,
      [responseField]: result.candidates[0],
      [config.candidates.field]: result.candidates,
    };
  } else {
    return {
      ...metadata,
      [responseField]: result.candidates[0],
    };
  }
});

function getSubstitutedPrompt(data: any, prompt: string) {
  const view: Record<string, string> = {};

  const variableFields = extractHandlebarsVariables(prompt);

  for (const field of variableFields || []) {
    if (!data[field]) {
      throw missingVariableError(field);
    }
    if (typeof data[field] !== 'string') {
      throw variableTypeError(field);
    }
    view[field] = data[field];
  }

  // if prompt contains handlebars for variable substitution, do it:
  const substitutedPrompt = Mustache.render(prompt, view);

  return substitutedPrompt;
}

interface Metadata {
  safetyMetadata?: Record<string, any>;
}

// Extract metadata from the result
function extractMetadata(result: GenerativeResponse): Metadata {
  const metadata: Metadata = {};
  if (result.safetyMetadata) {
    metadata.safetyMetadata = {};

    for (const key of Object.keys(result.safetyMetadata)) {
      if (result.safetyMetadata[key] !== undefined) {
        metadata.safetyMetadata[key] = result.safetyMetadata[key];
      }
    }
  }
  return metadata;
}
