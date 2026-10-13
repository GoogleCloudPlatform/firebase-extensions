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

import {config, VectorStoreProvider} from '../config';
import * as admin from 'firebase-admin';
import {FirestoreVectorStoreClient} from './firestore';

export const getVectorStoreClient = ({
  firestore,
  distanceMeasure,
}: {
  firestore: admin.firestore.Firestore;
  distanceMeasure: 'COSINE' | 'EUCLIDEAN' | 'DOT_PRODUCT';
}) => {
  switch (config.vectorStoreProvider) {
    case 'firestore' as VectorStoreProvider:
      return new FirestoreVectorStoreClient(firestore, distanceMeasure);
    default:
      throw new Error('Provider option not implemented');
  }
};

export const textVectorStoreClient = getVectorStoreClient({
  firestore: admin.firestore(),
  distanceMeasure: config.distanceMeasure,
});
