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
import {Prefilter} from '../queries/util';

export class VectorStoreClient {
  firestore: admin.firestore.Firestore;
  constructor(firestore: admin.firestore.Firestore) {
    this.firestore = firestore;
  }
  async query(
    _query: number[],
    _collection: string,
    _prefilters: Prefilter[],
    _limit: number,
    _outputField: string
  ): Promise<{ids: string[]}> {
    throw new Error('Not implemented');
  }

  // TODO: not sure if the native API will need this or not?
  async createIndex(_collectionName: string): Promise<any> {
    // throw new Error("Not implemented");
  }

  async upsert(
    _datapoints: {embedding: number[]; id: string}[]
  ): Promise<void> {}
}
