/*
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
import * as admin from 'firebase-admin';
import {ImageAnnotatorClient} from '@google-cloud/vision';
import * as logs from './logs';
import config from './config';
import {formatObjects, getVisionRequest, shouldDetectObjects} from './util';
import {IAnnotatedImageResponse} from './types';

admin.initializeApp();

const client = new ImageAnnotatorClient();

export const detectObjects = functions.storage
  .bucket(process.env.IMG_BUCKET)
  .object()
  .onFinalize(async object => {
    logs.functionTriggered(config);

    if (!shouldDetectObjects(object)) {
      return;
    }

    const request = getVisionRequest(object.name!);

    logs.detectingObjects(object.name!);
    let results: IAnnotatedImageResponse;

    try {
      if (!client.objectLocalization) {
        throw new Error('Object localization client not initialized.');
      }
      [results] = await client.objectLocalization!(request);
    } catch (error) {
      logs.objectsDetectionError(object.name!, error);
      return;
    }
    logs.objectsDetectionComplete(object.name!);

    let objectAnnotations = results.localizedObjectAnnotations;

    if (!objectAnnotations) {
      logs.noObjects(object.name!);
      objectAnnotations = [];
    }

    logs.writingToFirestore(object.name!);
    // prevent from creating a document with a slash in the name

    const filePath = `gs://${object.bucket}/${object.name}`;

    const data = {
      file: filePath,
      objects: formatObjects(objectAnnotations),
    };

    const snapshot = await admin
      .firestore()
      .collection(config.collectionPath)
      .where('file', '==', filePath)
      .get();

    // if document with file field filePath already exists, overwrite it
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await admin
        .firestore()
        .collection(config.collectionPath)
        .doc(docId)
        .set(data, {merge: true});
    } else {
      await admin.firestore().collection(config.collectionPath).add(data);
    }
  });
