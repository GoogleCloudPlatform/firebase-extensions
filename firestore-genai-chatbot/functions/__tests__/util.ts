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

import {Timestamp} from 'firebase-admin/firestore';

export const expectToProcessCorrectly = (
  firestoreCallData: any[],
  message: any,
  _addCreateTime = true,
  mockResponse = 'test response'
) => {
  expect(firestoreCallData[0]).toEqual({
    ...message,
  });

  expect(firestoreCallData[1]).toEqual({
    ...message,
    createTime: expect.any(Timestamp),
    status: {
      state: 'PROCESSING',
      startTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    },
  });

  expect(firestoreCallData[1].status.startTime).toEqual(
    firestoreCallData[1].status.updateTime
  );

  expect(firestoreCallData[2]).toEqual({
    ...message,
    response: mockResponse,
    candidates: expect.any(Array),
    createTime: expect.any(Timestamp),
    status: {
      state: 'COMPLETED',
      startTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
      completeTime: expect.any(Timestamp),
    },
  });

  expect(firestoreCallData[2].status.startTime).toEqual(
    firestoreCallData[1].status.startTime
  );

  expect(firestoreCallData[2].status.updateTime).toEqual(
    firestoreCallData[2].status.completeTime
  );
};
