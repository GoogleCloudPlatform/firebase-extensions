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

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';

const mockVerifyIdToken = jest.fn<any>();
const mockEnqueue = jest.fn<any>();
const mockTaskQueue = jest.fn(() => ({enqueue: mockEnqueue}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('firebase-admin/functions', () => ({
  getFunctions: jest.fn(() => ({
    taskQueue: mockTaskQueue,
  })),
}));

jest.mock('../src/config', () => ({
  __esModule: true,
  default: {
    projectId: 'demo-gcp',
    location: 'us-central1',
    instanceId: 'firestore-incremental-capture',
    authorizedRestorePrincipals: [],
  },
}));

import {onHttpRunRestorationHandler} from '../src/tasks/on_http_run_restoration_handler';

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: jest.fn((code: number) => {
      res.statusCode = code;
      return res;
    }),
    send: jest.fn((body: unknown) => {
      res.body = body;
      return res;
    }),
  };
  return res;
}

describe('onHttpRunRestorationHandler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {...originalEnv};
    delete process.env.AUTHORIZED_RESTORE_PRINCIPALS;
    delete process.env.RESTORATION_AUDIENCE;
    delete process.env.FUNCTION_NAME;
    mockEnqueue.mockResolvedValue(undefined);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 405 for non-POST requests', async () => {
    const req: any = {method: 'GET', headers: {}, body: {}};
    const res = createMockResponse();

    await onHttpRunRestorationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('returns 401 when Authorization header is missing', async () => {
    const req: any = {method: 'POST', headers: {}, body: {timestamp: 1000}};
    const res = createMockResponse();

    await onHttpRunRestorationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('returns 401 when OIDC token verification fails', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const req: any = {
      method: 'POST',
      headers: {authorization: 'Bearer bad-token'},
      body: {timestamp: 1000},
    };
    const res = createMockResponse();

    await onHttpRunRestorationHandler(req, res);

    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'bad-token',
      audience:
        'https://us-central1-demo-gcp.cloudfunctions.net/ext-firestore-incremental-capture-onHttpRunRestoration',
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('returns 403 when AUTHORIZED_RESTORE_PRINCIPALS is empty (fail closed)', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({email: 'admin@example.com', email_verified: true}),
    });
    const req: any = {
      method: 'POST',
      headers: {authorization: 'Bearer valid-token'},
      body: {timestamp: 1000},
    };
    const res = createMockResponse();

    await onHttpRunRestorationHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('returns 403 when email is unverified or not in allowlist', async () => {
    process.env.AUTHORIZED_RESTORE_PRINCIPALS = 'admin@example.com';

    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({email: 'admin@example.com', email_verified: false}),
    });
    const unverifiedRes = createMockResponse();
    await onHttpRunRestorationHandler(
      {
        method: 'POST',
        headers: {authorization: 'Bearer valid-token'},
        body: {timestamp: 1000},
      } as any,
      unverifiedRes
    );
    expect(unverifiedRes.status).toHaveBeenCalledWith(403);

    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({email: 'attacker@gmail.com', email_verified: true}),
    });
    const unauthorizedRes = createMockResponse();
    await onHttpRunRestorationHandler(
      {
        method: 'POST',
        headers: {authorization: 'Bearer valid-token'},
        body: {timestamp: 1000},
      } as any,
      unauthorizedRes
    );
    expect(unauthorizedRes.status).toHaveBeenCalledWith(403);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('returns 400 when timestamp is missing or in the future', async () => {
    process.env.AUTHORIZED_RESTORE_PRINCIPALS = 'admin@example.com';
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({email: 'admin@example.com', email_verified: true}),
    });

    const missingRes = createMockResponse();
    await onHttpRunRestorationHandler(
      {
        method: 'POST',
        headers: {authorization: 'Bearer valid-token'},
        body: {},
      } as any,
      missingRes
    );
    expect(missingRes.status).toHaveBeenCalledWith(400);

    const futureRes = createMockResponse();
    await onHttpRunRestorationHandler(
      {
        method: 'POST',
        headers: {authorization: 'Bearer valid-token'},
        body: {timestamp: Date.now() + 60_000},
      } as any,
      futureRes
    );
    expect(futureRes.status).toHaveBeenCalledWith(400);
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  test('enqueues restoration task and returns 200 for authorized caller', async () => {
    process.env.AUTHORIZED_RESTORE_PRINCIPALS =
      'other@example.com, Admin@Example.com ';
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({email: 'admin@example.com', email_verified: true}),
    });

    const timestamp = Date.now() - 60_000;
    const body = {timestamp};
    const res = createMockResponse();

    await onHttpRunRestorationHandler(
      {
        method: 'POST',
        headers: {authorization: 'bearer valid-token'},
        body,
      } as any,
      res
    );

    expect(mockTaskQueue).toHaveBeenCalledWith(
      'projects/demo-gcp/locations/us-central1/functions/onBackupRestore',
      'firestore-incremental-capture'
    );
    expect(mockEnqueue).toHaveBeenCalledWith(body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toBe('Restoration task enqueued');
  });
});
