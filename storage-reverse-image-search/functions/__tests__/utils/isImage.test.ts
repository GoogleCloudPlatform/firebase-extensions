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

import {isImage} from '../../src/common/utils';

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

describe('isImage', () => {
  test('should return true for valid image extensions', () => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

    validExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(true);
    });
  });

  test('should return false for invalid image extensions', () => {
    const invalidExtensions = ['txt', 'pdf', 'docx', 'mp4'];

    invalidExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(false);
    });
  });

  test('should return false for filenames with no extension', () => {
    const filename = 'test';
    expect(isImage(filename)).toBe(false);
  });

  test('should be case-insensitive', () => {
    const uppercaseExtensions = ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP'];

    uppercaseExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(true);
    });
  });
});
