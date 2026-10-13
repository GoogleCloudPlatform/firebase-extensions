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

import * as admin from 'firebase-admin';
import config from './config';

import {Timestamp} from 'firebase-admin/firestore';

export async function updateFirestoreDocument(documentId: string, data: any) {
  if (!config.collectionPath) return;

  /** Get the Firestore document */
  const db = admin.firestore();
  const collection = db.collection(config.collectionPath);
  const document = collection.doc(documentId);

  await document.set({...data}, {merge: true});
}

export async function getFirestoreDocument(fileName: string): Promise<string> {
  if (!config.collectionPath) return '';

  const db = admin.firestore();

  const doc = await db.collection(config.collectionPath).add({
    status: 'PROCESSING',
    fileName,
    created: Timestamp.now(),
  });

  return doc.id;
}
