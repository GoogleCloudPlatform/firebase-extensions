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

import * as firebaseFunctionsTest from 'firebase-functions-test';
import {onIndexDeployed} from '../../src/index';
import config from '../../src/config';

jest.mock('../../src/config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',

    // User-defined vars
    collectionName: 'test-collection',
    embeddingMethod: 'use',
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    featureNormType: 'NONE',
    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
    dimensions: 512,
    bucketName: 'demo-gcp-ext-test-instance',
  },
}));

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

const mockGetDeployedIndex = jest
  .fn()
  .mockImplementation(() => 'test-index-endpoint.com');

jest.mock('../../src/common/vertex', () => ({
  getDeployedIndex: () => mockGetDeployedIndex(),
}));

const wrappedOnIndexDeployed = fft.wrap(onIndexDeployed);

describe('onIndexDeployed', () => {
  test('should not run if no operation', async () => {
    await wrappedOnIndexDeployed();
    expect(mockGetDeployedIndex).not.toHaveBeenCalled();
  });

  test('should not run if not last operation', async () => {
    wrappedOnIndexDeployed({
      data: {
        operation: {
          last: false,
        },
      },
    });
  });
});
