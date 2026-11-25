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

const mockDownload = jest.fn();
const mockFile = jest.fn(() => ({download: mockDownload}));
const mockBucket = jest.fn(() => ({file: mockFile}));

jest.mock('firebase-admin', () => ({
  storage: jest.fn(() => ({bucket: mockBucket})),
}));

const mockConfig: {
  projectId?: string;
  allowedStorageBuckets?: Set<string>;
} = {
  projectId: 'demo-gcp',
};

jest.mock('../src/config', () => {
  const prevProvider = process.env.GENERATIVE_AI_PROVIDER;
  process.env.GENERATIVE_AI_PROVIDER = prevProvider || 'google-ai';
  const actual = jest.requireActual('../src/config') as {
    resolveAllowedStorageBuckets: (
      allowedBucketsEnv?: string,
      projectId?: string
    ) => Set<string>;
  };
  if (prevProvider === undefined) {
    delete process.env.GENERATIVE_AI_PROVIDER;
  }
  return {
    __esModule: true,
    default: mockConfig,
    resolveAllowedStorageBuckets: actual.resolveAllowedStorageBuckets,
  };
});

import {
  compressImageBuffer,
  extractBucketName,
  getImageFromStorage,
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

  test('throws an error for gs:// URIs with an empty bucket name', () => {
    expect(() => extractBucketName('gs:///pic.png')).toThrow(
      'Invalid URL format'
    );
  });
});

describe('getImageFromStorage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {...originalEnv};
    delete process.env.ALLOWED_STORAGE_BUCKETS;
    delete process.env.PROJECT_ID;
    mockConfig.projectId = 'demo-gcp';
    delete mockConfig.allowedStorageBuckets;
    mockDownload.mockResolvedValue([Buffer.from('image-bytes')]);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('downloads image from default appspot.com project bucket', async () => {
    const result = await getImageFromStorage(
      'gs://demo-gcp.appspot.com/folder/image.png'
    );

    expect(mockBucket).toHaveBeenCalledWith('demo-gcp.appspot.com');
    expect(mockFile).toHaveBeenCalledWith('folder/image.png');
    expect(result).toEqual({
      buffer: Buffer.from('image-bytes'),
      imageExtension: 'png',
    });
  });

  test('downloads image from default firebasestorage.app project bucket', async () => {
    const result = await getImageFromStorage(
      'gs://demo-gcp.firebasestorage.app/photos/pic.jpeg'
    );

    expect(mockBucket).toHaveBeenCalledWith('demo-gcp.firebasestorage.app');
    expect(mockFile).toHaveBeenCalledWith('photos/pic.jpeg');
    expect(result.imageExtension).toBe('jpeg');
  });

  test('normalizes uppercase image extensions', async () => {
    const result = await getImageFromStorage(
      'gs://demo-gcp.appspot.com/photo.PNG'
    );

    expect(mockBucket).toHaveBeenCalledWith('demo-gcp.appspot.com');
    expect(mockFile).toHaveBeenCalledWith('photo.PNG');
    expect(result.imageExtension).toBe('png');
  });

  test('rejects cross-bucket gs:// URI before calling Cloud Storage', async () => {
    await expect(
      getImageFromStorage('gs://other-bucket/secret.png')
    ).rejects.toThrow(
      'Access denied: bucket "other-bucket" is not in the allowed storage buckets. Configure ALLOWED_STORAGE_BUCKETS to allow additional buckets.'
    );
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('enforces explicit ALLOWED_STORAGE_BUCKETS allowlist when set', async () => {
    process.env.ALLOWED_STORAGE_BUCKETS = 'bucket-a, bucket-b';

    await expect(
      getImageFromStorage('gs://bucket-a/ok.jpg')
    ).resolves.toMatchObject({imageExtension: 'jpg'});
    expect(mockBucket).toHaveBeenCalledWith('bucket-a');

    await expect(
      getImageFromStorage('gs://bucket-b/ok.png')
    ).resolves.toMatchObject({imageExtension: 'png'});
    expect(mockBucket).toHaveBeenCalledWith('bucket-b');

    jest.clearAllMocks();
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/blocked.jpg')
    ).rejects.toThrow(
      'Access denied: bucket "demo-gcp.appspot.com" is not in the allowed storage buckets. Configure ALLOWED_STORAGE_BUCKETS to allow additional buckets.'
    );
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('fails closed when ALLOWED_STORAGE_BUCKETS is whitespace/comma-only', async () => {
    process.env.ALLOWED_STORAGE_BUCKETS = ' , ';

    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/blocked.jpg')
    ).rejects.toThrow(
      'Access denied: bucket "demo-gcp.appspot.com" is not in the allowed storage buckets. Configure ALLOWED_STORAGE_BUCKETS to allow additional buckets.'
    );
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('rejects URI with empty bucket name as Invalid URL format', async () => {
    await expect(getImageFromStorage('gs:///pic.png')).rejects.toThrow(
      'Invalid URL format'
    );
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('rejects URI with missing object path', async () => {
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com')
    ).rejects.toThrow('Unable to extract image path from Cloud Storage URI.');
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/')
    ).rejects.toThrow('Unable to extract image path from Cloud Storage URI.');
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('rejects directory extensions, dotfiles, and non-image extensions', async () => {
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/dir.png/noext')
    ).rejects.toThrow('Unable to extract image extension.');
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/.png')
    ).rejects.toThrow('Unable to extract image extension.');
    await expect(
      getImageFromStorage('gs://demo-gcp.appspot.com/secret.txt')
    ).rejects.toThrow('Unable to extract image extension.');
    expect(mockBucket).not.toHaveBeenCalled();
  });

  test('fails closed when no projectId or allowed bucket is configured', async () => {
    mockConfig.projectId = undefined;

    await expect(
      getImageFromStorage('gs://undefined.appspot.com/pic.png')
    ).rejects.toThrow(
      'Access denied: bucket "undefined.appspot.com" is not in the allowed storage buckets. Configure ALLOWED_STORAGE_BUCKETS to allow additional buckets.'
    );
    expect(mockBucket).not.toHaveBeenCalled();
  });
});
