import {Timestamp} from 'firebase-admin/firestore';

export const expectToProcessCorrectly = (
  firestoreCallData: any[],
  message: any,
  mockResponse = 'test response',
  candidateCount?: number
) => {
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

  expect(firestoreCallData[1].status.startTime).toEqual(
    firestoreCallData[1].status.updateTime
  );

  const expectedCandidates =
    candidateCount !== undefined
      ? Array(candidateCount).fill(mockResponse)
      : [];

  const expectedCompleteData =
    expectedCandidates.length > 0
      ? {
          ...message,
          output: mockResponse,
          candidates: expectedCandidates,
          status: {
            state: 'COMPLETED',
            startTime: expect.any(Timestamp),
            updateTime: expect.any(Timestamp),
            completeTime: expect.any(Timestamp),
          },
        }
      : {
          ...message,
          output: mockResponse,
          status: {
            state: 'COMPLETED',
            startTime: expect.any(Timestamp),
            updateTime: expect.any(Timestamp),
            completeTime: expect.any(Timestamp),
          },
        };

  expect(firestoreCallData[2]).toEqual(expectedCompleteData);

  expect(firestoreCallData[2].status.startTime).toEqual(
    firestoreCallData[1].status.startTime
  );

  expect(firestoreCallData[2].status.updateTime).toEqual(
    firestoreCallData[2].status.completeTime
  );
};

export const expectToError = (
  firestoreCallData: any[],
  message: any,
  errorMessage: string
) => {
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

  expect(firestoreCallData[1].status.startTime).toEqual(
    firestoreCallData[1].status.updateTime
  );

  expect(firestoreCallData[2]).toEqual({
    ...message,
    status: {
      state: 'ERRORED',
      error: errorMessage,
      startTime: expect.any(Timestamp),
      completeTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    },
  });
};
