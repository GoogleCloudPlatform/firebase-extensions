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
import {https} from 'firebase-functions/v1';
import {Prefilter} from '../../src/queries/util';
import {FirebaseFirestoreError} from 'firebase-admin/firestore';
import {FirestoreVectorStoreClient} from '../../src/vector-store/firestore';

class FakeFirebaseFirestoreError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = `firestore/${code}`;
    this.name = 'FirebaseFirestoreError';

    // we need this to make sure it passes instanceof check
    Object.setPrototypeOf(this, FirebaseFirestoreError.prototype);
  }
}

jest.mock('firebase-admin', () => ({
  firestore: jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    findNearest: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: [{ref: {id: 'doc-1'}}, {ref: {id: 'doc-2'}}],
    }),
  }),
}));

describe('firestoreVectorStore', () => {
  let client: FirestoreVectorStoreClient;
  let mockFirestore: admin.firestore.Firestore;
  let mockCollectionRef: admin.firestore.CollectionReference;
  const mockQuery = [0.1, 0.2, 0.3];
  const mockPrefilters: Prefilter[] = [
    {field: 'category', operator: '==', value: 'test'},
  ];
  const mockLimit = 5;
  const mockOutputField = 'embedding';

  beforeEach(() => {
    mockFirestore = admin.firestore() as admin.firestore.Firestore;
    mockCollectionRef = mockFirestore.collection(
      'test-collection'
    ) as admin.firestore.CollectionReference;
    client = new FirestoreVectorStoreClient(mockFirestore, 'COSINE');
  });

  test('should handle Firestore query with prefilters', async () => {
    const result = await client.query(
      mockQuery,
      'test-collection',
      mockPrefilters,
      mockLimit,
      mockOutputField
    );
    expect(mockCollectionRef.where).toHaveBeenCalledWith(
      'category',
      '==',
      'test'
    );
    expect(mockCollectionRef.findNearest).toHaveBeenCalledWith(
      mockOutputField,
      mockQuery,
      {limit: mockLimit, distanceMeasure: 'COSINE'}
    );
    expect(result).toEqual({ids: ['doc-1', 'doc-2']});
  });

  test('should handle Firestore query without prefilters', async () => {
    const result = await client.query(
      mockQuery,
      'test-collection',
      mockPrefilters,
      mockLimit,
      mockOutputField
    );
    expect(mockCollectionRef.findNearest).toHaveBeenCalledWith(
      mockOutputField,
      mockQuery,
      {limit: mockLimit, distanceMeasure: 'COSINE'}
    );
    expect(result).toEqual({ids: ['doc-1', 'doc-2']});
  });

  test('should transform Firestore error to HttpsError', async () => {
    const error = new FakeFirebaseFirestoreError(
      'permission-denied',
      'Permission denied.'
    );

    mockFirestore.collection = jest.fn().mockImplementation(() => {
      throw error;
    });

    try {
      await client.query(
        mockQuery,
        'test-collection',
        mockPrefilters,
        mockLimit,
        mockOutputField
      );
    } catch (err) {
      console.log('err', err);
      expect(err).toBeInstanceOf(https.HttpsError);
      expect(err.code).toBe('permission-denied');
      expect(err.message).toBe('Permission denied.');
    }
  });
});
