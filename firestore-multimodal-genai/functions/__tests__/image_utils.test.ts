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

import * as fs from 'fs';
import * as path from 'path';
import {
  compressImageBuffer,
  extractBucketName,
} from '../src/generative-client/image_utils';
describe('compressImageBuffer', () => {
  test('should compress large image', async () => {
    // get image fixture

    const imagePath = path.posix.join(__dirname, './fixtures/large-image.jpg');

    const imageBuffer = fs.readFileSync(imagePath);

    const compressed = await compressImageBuffer(imageBuffer, 'jpg');

    expect(compressed).toBeDefined();
    expect(compressed.length).toBeLessThan(imageBuffer.length);
    expect(compressed.length).toBeLessThan(900000);
  });
});

describe('extractBucketName', () => {
  test('extracts the bucket name from a valid URL', () => {
    const url = 'gs://my-bucket/path/to/object';
    expect(extractBucketName(url)).toBe('my-bucket');
  });

  test('throws an error for URLs not containing gs://', () => {
    const url = 'http://my-bucket/path/to/object';
    expect(() => extractBucketName(url)).toThrow('Invalid URL format');
  });

  test('throws an error for URLs with gs:// not at the start', () => {
    const url = 'http://my-bucket/gs://path/to/object';
    expect(() => extractBucketName(url)).toThrow('Invalid URL format');
  });

  test('handles URLs with only the bucket name after gs://', () => {
    const url = 'gs://my-bucket';
    expect(extractBucketName(url)).toBe('my-bucket');
  });

  test('throws an error for empty strings', () => {
    const url = '';
    expect(() => extractBucketName(url)).toThrow('Invalid URL format');
  });
});
