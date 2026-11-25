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

const mockFirestoreGet = jest.fn();
const mockQueryIndex = jest.fn();
const mockGetEmbeddings = jest.fn();

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: mockFirestoreGet,
    })),
  })),
}));

jest.mock('../../src/common/vertex', () => ({
  queryIndex: (...args: unknown[]) => mockQueryIndex(...args),
}));

jest.mock('../../src/common/datapoints', () => ({
  getEmbeddings: (...args: unknown[]) => mockGetEmbeddings(...args),
}));

jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',
    metadataDoc: '_ext-test-instance/metadata',
    bucketName: 'demo-gcp-ext-test-instance',
  },
}));

import {EventEmitter} from 'events';
import {queryIndex} from '../../src/index';
import {queryIndexHandler} from '../../src/functions/query_index';

describe('queryIndexHandler auth & bounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddings.mockResolvedValue([[0.1, 0.2]]);
    mockFirestoreGet.mockResolvedValue({
      data: () => ({
        publicEndpointDomainName: 'example.endpoint',
        indexEndpoint: 'projects/p/locations/l/indexEndpoints/123',
      }),
    });
    mockQueryIndex.mockResolvedValue('Result!');
  });

  test('rejects HTTP callable requests missing App Check token when enforceAppCheck is enabled', async () => {
    const res: any = Object.assign(new EventEmitter(), {
      statusCode: 0,
      headers: {} as Record<string, string>,
      body: undefined as unknown,
      setHeader: jest.fn((k: string, v: string) => {
        res.headers[k] = v;
      }),
      getHeader: jest.fn((k: string) => res.headers[k]),
      status: jest.fn((code: number) => {
        res.statusCode = code;
        return res;
      }),
      send: jest.fn((body: unknown) => {
        res.body = body;
        res.emit('finish');
        return res;
      }),
      end: jest.fn(() => {
        res.emit('finish');
      }),
    });
    const req: any = {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      header: (name: string) => req.headers[name.toLowerCase()],
      body: {data: {query: ['hello']}},
    };

    await (queryIndex as any)(req, res);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({
      error: {
        message: 'Unauthenticated',
        status: 'UNAUTHENTICATED',
      },
    });
    expect(mockGetEmbeddings).not.toHaveBeenCalled();
    expect(mockFirestoreGet).not.toHaveBeenCalled();
    expect(mockQueryIndex).not.toHaveBeenCalled();
  });

  test('rejects unauthenticated caller before reading metadata or embeddings', async () => {
    await expect(
      queryIndexHandler({query: ['hello']}, undefined)
    ).rejects.toMatchObject({code: 'unauthenticated'});
    await expect(
      queryIndexHandler({query: ['hello']}, {} as any)
    ).rejects.toMatchObject({code: 'unauthenticated'});

    expect(mockGetEmbeddings).not.toHaveBeenCalled();
    expect(mockFirestoreGet).not.toHaveBeenCalled();
    expect(mockQueryIndex).not.toHaveBeenCalled();
  });

  test('rejects invalid or out-of-range neighbours count and null data', async () => {
    const authContext = {auth: {uid: 'user-1'}} as any;

    await expect(queryIndexHandler(null, authContext)).rejects.toMatchObject({
      code: 'invalid-argument',
    });

    for (const invalid of [
      0,
      -5,
      101,
      1.5,
      true,
      [5],
      {value: 5},
      'abc',
      '0x10',
      '0b11',
      '1e1',
      '+5',
    ]) {
      await expect(
        queryIndexHandler({query: ['hello'], neighbours: invalid}, authContext)
      ).rejects.toMatchObject({code: 'invalid-argument'});
    }

    expect(mockQueryIndex).not.toHaveBeenCalled();
  });

  test('allows valid boundary and default neighbours counts for authenticated caller', async () => {
    const authContext = {auth: {uid: 'user-1'}} as any;

    await queryIndexHandler({query: ['hello']}, authContext);
    expect(mockQueryIndex).toHaveBeenLastCalledWith(
      expect.any(Array),
      10,
      'example.endpoint',
      '123'
    );

    await queryIndexHandler({query: ['hello'], neighbours: 1}, authContext);
    expect(mockQueryIndex).toHaveBeenLastCalledWith(
      expect.any(Array),
      1,
      'example.endpoint',
      '123'
    );

    await queryIndexHandler({query: ['hello'], neighbours: 100}, authContext);
    expect(mockQueryIndex).toHaveBeenLastCalledWith(
      expect.any(Array),
      100,
      'example.endpoint',
      '123'
    );

    const result = await queryIndexHandler(
      {query: ['hello'], neighbours: ' 5 '},
      authContext
    );

    expect(mockQueryIndex).toHaveBeenLastCalledWith(
      expect.any(Array),
      5,
      'example.endpoint',
      '123'
    );
    expect(result).toEqual({
      status: 'ok',
      message: 'Query successful',
      data: 'Result!',
    });
  });
});
