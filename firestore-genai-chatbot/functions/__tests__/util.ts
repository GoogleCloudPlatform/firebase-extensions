import {Timestamp} from 'firebase-admin/firestore';

export const expectToProcessCorrectly = (
  firestoreCallData: any[],
  message: any,
  addCreateTime = true,
  mockResponse = 'test response'
) => {
  expect(firestoreCallData[0]).toEqual({
    ...message,
  });

  expect(firestoreCallData[1]).toEqual({
    ...message,
    createTime: addCreateTime ? expect.any(Timestamp) : undefined,
    status: {
      state: 'PROCESSING',
      startTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    },
  });

  expect(firestoreCallData[1].status.startTime).toEqual(
    firestoreCallData[1].status.updateTime
  );

  expect(firestoreCallData[1].status.startTime).toEqual(
    firestoreCallData[1].createTime
  );

  expect(firestoreCallData[2]).toEqual({
    ...message,
    response: mockResponse,
    createTime: addCreateTime ? expect.any(Timestamp) : undefined,
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
};
