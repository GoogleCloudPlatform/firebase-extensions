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

import {getEmbeddingsBucket} from '../../src/common/utils';

const mockGetMetadata = jest.fn();
const mockCreate = jest.fn();

jest.mock('firebase-admin', () => {
  return {
    storage: () => ({
      bucket: () => ({
        getMetadata: mockGetMetadata,
        create: mockCreate,
      }),
    }),
  };
});

jest.mock('../../src/config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',

    // User-defined vars
    path: 'images',
    modelUrl: 'test-model-url',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 256,
    bucketName: 'demo-gcp-ext-test-instance',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
  },
}));

describe('getEmbeddingsBucket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return the existing bucket', async () => {
    mockGetMetadata.mockResolvedValueOnce([{name: 'test'}]);

    await getEmbeddingsBucket();

    expect(mockGetMetadata).toHaveBeenCalled();
  });
});
