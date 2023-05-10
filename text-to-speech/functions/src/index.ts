/*
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

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import config from './config';
import * as tts from '@google-cloud/text-to-speech';
import {ISynthesizeSpeechRequest, ISynthesizeSpeechResponse} from './types';
import {buildRequest, BuildRequestOptions, getFileExtension} from './util';

const logger = functions.logger;

admin.initializeApp();

const ttsClient = new tts.TextToSpeechClient();

logger.log('Initializing text-to-speech extension with config:', config);

export const textToSpeech = functions.firestore
  .document(`${config.collectionPath}/{docId}`)
  .onCreate(async snap => {
    if (snap.data().text) {
      const {text, languageCode, ssmlGender, audioEncoding, voiceName} =
        snap.data() as BuildRequestOptions;

      const request = config.enablePerDocumentOverrides
        ? buildRequest({
            text,
            languageCode,
            ssmlGender,
            audioEncoding,
            voiceName,
          })
        : buildRequest({text});

      try {
        const speech = await processText(request);
        if (speech && speech.audioContent) {
          // Merge the address validity data with the address document.
          const fileExtension = getFileExtension(
            audioEncoding || config.audioEncoding
          );

          const fileName = config.storagePath
            ? `${config.storagePath}/${snap.id}${fileExtension}`
            : `${snap.id}${fileExtension}`;

          const bucket = admin.storage().bucket(config.bucketName);

          const file = bucket.file(fileName);
          await file.save(Buffer.from(speech.audioContent));

          return;
        }
      } catch (error) {
        throw error;
      }
    }
    return;
  });

async function processText(request: ISynthesizeSpeechRequest) {
  let response: ISynthesizeSpeechResponse;

  // Performs the text-to-speech request
  try {
    [response] = await ttsClient.synthesizeSpeech(request);
  } catch (e) {
    logger.error(e);
    throw e;
  }
  return response;
}
