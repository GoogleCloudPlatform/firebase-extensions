import {Timestamp} from 'firebase-admin/firestore';

export const expectToProcess = (firestoreCallData: any[], message: any) => {
  expect(firestoreCallData[0]).toEqual({
    ...message,
  });

  expect(firestoreCallData[1]).toEqual({
    ...message,
    status: {
      state: 'PROCESSING',
      startTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    },
  });

  expect(firestoreCallData[2]).toEqual({
    ...message,
    response: 'test response',
    error: null,
    status: {
      state: 'COMPLETED',
      startTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
      completeTime: expect.any(Timestamp),
    },
  });
};
