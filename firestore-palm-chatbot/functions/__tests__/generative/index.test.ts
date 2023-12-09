import * as firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';
import config from '../../src/config';
import {generateMessage} from '../../src/index';
import {WrappedFunction} from 'firebase-functions-test/lib/v1';
import {Change} from 'firebase-functions/v1';

import {QuerySnapshot} from 'firebase-admin/firestore';

process.env.GCLOUD_PROJECT = 'demo-gcp';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// // We mock out the config here instead of setting environment variables directly
jest.mock('../../src/config', () => ({
  default: {
    palm: {
      model: 'models/chat-bison-001',
    },
    vertex: {
      model: 'models/chat-bison-001',
    },
    collectionName: 'discussionsTestGenerative/{discussionId}/messages',
    location: 'us-central1',
    orderField: 'createTime',
    promptField: 'prompt',
    responseField: 'response',
    enableDiscussionOptionOverrides: true,
    candidatesField: 'candidates',
    provider: 'generative',
    model: 'models/chat-bison-001',
  },
}));

// // mock to check the arguments passed to the annotateVideo function+
const mockAPI = jest.fn();

jest.mock('@google-ai/generativelanguage', () => {
  return {
    ...jest.requireActual('@google-ai/generativelanguage'),
    DiscussServiceClient: function mockedClient() {
      return {
        generateMessage: async (args: unknown) => {
          mockAPI(args);
          return [
            {
              candidates: [
                {
                  content: 'test response',
                },
              ],
            },
          ];
        },
      };
    },
  };
});

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
});

admin.initializeApp({
  projectId: 'demo-gcp',
});

type DocumentReference = admin.firestore.DocumentReference;
type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot<DocumentData>;
type WrappedFirebaseFunction = WrappedFunction<
  Change<DocumentSnapshot | undefined>,
  void
>;
const Timestamp = admin.firestore.Timestamp;

const wrappedGenerateMessage = fft.wrap(
  generateMessage
) as WrappedFirebaseFunction;

const firestoreObserver = jest.fn((_x: any) => {});
let collectionName: string;

describe('generateMessage', () => {
  let unsubscribe: (() => void) | undefined;

  // clear firestore
  beforeEach(async () => {
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
    jest.clearAllMocks();
    const randomInteger = Math.floor(Math.random() * 1000000);
    collectionName = config.collectionName.replace(
      '{discussionId}',
      randomInteger.toString()
    );

    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(collectionName)
      .onSnapshot((snap: QuerySnapshot) => {
        /** There is a bug on first init and write, causing the the emulator to the observer is called twice
         * A snapshot is registered on the first run, this affects the observer count
         * This is a workaround to ensure the observer is only called when it should be
         */
        if (snap.docs.length) firestoreObserver(snap);
      });
  });
  afterEach(() => {
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
    jest.clearAllMocks();
  });

  test('should not run if the prompt field is not set', async () => {
    const notMessage = {
      notPrompt: 'hello chat bison',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    await expectNoOp();
  });

  test('should not run if the prompt field is empty', async () => {
    const notMessage = {
      prompt: '',
    };

    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    await expectNoOp();
  });

  test('should not run if the prompt field is not a string', async () => {
    const notMessage = {
      prompt: 123,
    };

    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    await expectNoOp();
  });

  test('should not run if response field is set from the start', async () => {
    const message = {
      prompt: 'hello chat bison',
      [config.responseField]: 'user set response field for some reason',
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    const firestoreCallData = firestoreObserver.mock.calls.map(call => {
      return call[0].docs[0].data();
    });

    expect(firestoreCallData.length).toBe(2);
    expect(firestoreCallData[0]).toEqual({
      prompt: 'hello chat bison',
      response: 'user set response field for some reason',
    });
  });

  test('should not run if status field is set from the start', async () => {
    const message = {
      prompt: 'hello chat bison',
      status: 'user set status field for some reason',
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    const firestoreCallData = firestoreObserver.mock.calls.map(call => {
      return call[0].docs[0].data();
    });

    expect(firestoreCallData.length).toBe(2);
    expect(firestoreCallData[0]).toEqual({
      prompt: 'hello chat bison',
      status: 'user set status field for some reason',
    });
    expectToHaveKeys(firestoreCallData[1], ['prompt', 'status', 'createTime']);
  });

  test("should update initial record with createTime if it doesn't have it", async () => {
    const message = {
      prompt: 'hello chat bison',
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    expect(firestoreObserver).toHaveBeenCalledTimes(2);
    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    // This is left in just so we know our observer caught everything, sanity check:
    expectToHaveKeys(firestoreCallData[0], ['prompt']);
    expect(firestoreCallData[0].prompt).toEqual(message.prompt);

    expectToHaveKeys(firestoreCallData[1], [
      config.promptField,
      config.orderField,
    ]);
    expect(firestoreCallData[1][config.promptField]).toBe(message.prompt);
    expect(firestoreCallData[1][config.orderField]).toBeInstanceOf(Timestamp);
  });

  test('should run when given createTime', async () => {
    const message = {
      prompt: 'hello chat bison',
      createTime: Timestamp.now(),
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateMessage)(ref);

    expect(firestoreObserver).toHaveBeenCalledTimes(3);

    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    // This is left in just so we know our observer caught everything, sanity check:
    expectToHaveKeys(firestoreCallData[0], ['createTime', 'prompt']);
    expect(firestoreCallData[0].prompt).toEqual(message.prompt);
    const orderFieldValue = firestoreCallData[0].createTime;
    expect(orderFieldValue).toBeInstanceOf(Timestamp);
    expectToHaveKeys(firestoreCallData[1], [
      config.orderField,
      config.promptField,
      'status',
    ]);
    expect(firestoreCallData[1][config.promptField]).toBe(message.prompt);
    expect(firestoreCallData[1][config.orderField]).toEqual(orderFieldValue);

    // Then we expect the function to update the status to PROCESSING:
    expectToHaveKeys(firestoreCallData[1].status, [
      'state',
      'updateTime',
      'startTime',
    ]);
    expect(firestoreCallData[1].status.state).toEqual('PROCESSING');
    expect(firestoreCallData[1].status.updateTime).toBeInstanceOf(Timestamp);
    const startTime = firestoreCallData[1].status.startTime;
    expect(startTime).toEqual(expect.any(Timestamp));

    // Then we expect the function to update the status to COMPLETED, with the response field populated:
    expectToHaveKeys(firestoreCallData[2], [
      'createTime',
      'prompt',
      'response',
      'status',
    ]);
    expect(firestoreCallData[2].prompt).toEqual(message.prompt);
    expect(firestoreCallData[2].createTime).toEqual(orderFieldValue);
    expect(firestoreCallData[2].status).toEqual({
      startTime,
      state: 'COMPLETED',
      error: null,
      completeTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    });
    expect(firestoreCallData[2].response).toEqual('test response');

    // verify SDK is called with expected arguments
    const expectedRequestData = {
      candidateCount: undefined,
      model: 'models/chat-bison-001',
      prompt: {
        messages: [
          {
            author: '0',
            content: 'hello chat bison',
          },
        ],
        context: '',
        examples: [],
      },
      topP: undefined,
      topK: undefined,
      temperature: undefined,
    };
    // we expect the mock API to be called once
    expect(mockAPI).toHaveBeenCalledTimes(1);
    expect(mockAPI).toBeCalledWith(expectedRequestData);
  });

  test('should run when not given createTime', async () => {
    const message = {
      prompt: 'hello chat bison',
    };

    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = await admin.firestore().collection(collectionName).add(message);

    const beforeOrderField = await simulateFunctionTriggered(
      wrappedGenerateMessage
    )(ref);

    await simulateFunctionTriggered(wrappedGenerateMessage)(
      ref,
      beforeOrderField
    );

    // we expect the firestore observer to be called 4 times total.
    expect(firestoreObserver).toHaveBeenCalledTimes(4);
    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    // This is left in just so we know our observer caught everything, sanity check:
    expectToHaveKeys(firestoreCallData[0], ['prompt']);
    expect(firestoreCallData[0].prompt).toEqual(message.prompt);

    // We expect the function to first add a createTime:
    expectToHaveKeys(firestoreCallData[1], ['prompt', 'createTime']);
    expect(firestoreCallData[1].prompt).toEqual(message.prompt);
    const createTime = firestoreCallData[1].createTime;
    expect(createTime).toEqual(expect.any(Timestamp));

    // Then we expect the function to update the status to PROCESSING:
    expectToHaveKeys(firestoreCallData[2], ['prompt', 'createTime', 'status']);
    expect(firestoreCallData[2].prompt).toEqual(message.prompt);
    expect(firestoreCallData[2].createTime).toEqual(createTime);
    expectToHaveKeys(firestoreCallData[2].status, [
      'state',
      'updateTime',
      'startTime',
    ]);
    expect(firestoreCallData[2].status.state).toEqual('PROCESSING');
    expect(firestoreCallData[2].status.updateTime).toEqual(
      expect.any(Timestamp)
    );
    const startTime = firestoreCallData[2].status.startTime;
    expect(startTime).toEqual(expect.any(Timestamp));

    // Then we expect the function to update the status to COMPLETED, with the response field populated:
    expectToHaveKeys(firestoreCallData[3], [
      'prompt',
      'createTime',
      'response',
      'status',
    ]);
    expect(firestoreCallData[3].prompt).toEqual(message.prompt);
    expect(firestoreCallData[3].createTime).toEqual(createTime);
    expect(firestoreCallData[3].status).toEqual({
      startTime,
      state: 'COMPLETED',
      error: null,
      completeTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    });
    expect(firestoreCallData[3].response).toEqual('test response');

    // verify SDK is called with expected arguments
    const expectedRequestData = {
      candidateCount: undefined,
      model: 'models/chat-bison-001',
      prompt: {
        messages: [
          {
            author: '0',
            content: 'hello chat bison',
          },
        ],
        context: '',
        examples: [],
      },
      topP: undefined,
      topK: undefined,
      temperature: undefined,
    };
    // we expect the mock API to be called once
    expect(mockAPI).toHaveBeenCalledTimes(1);
    expect(mockAPI).toBeCalledWith(expectedRequestData);
  });
});

const simulateFunctionTriggered =
  (wrappedFunction: WrappedFirebaseFunction) =>
  async (ref: DocumentReference, before?: DocumentSnapshot) => {
    const data = (await ref.get()).data() as {[key: string]: unknown};
    const beforeFunctionExecution = fft.firestore.makeDocumentSnapshot(
      data,
      `${collectionName}/${ref.id}`
    ) as DocumentSnapshot;
    const change = fft.makeChange(before, beforeFunctionExecution);
    await wrappedFunction(change);
    return beforeFunctionExecution;
  };

const expectNoOp = async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(firestoreObserver).toHaveBeenCalledTimes(1);
  expect(mockAPI).toHaveBeenCalledTimes(0);
};

const expectToHaveKeys = (obj: Record<string, unknown>, keys: string[]) => {
  expect(Object.keys(obj).sort()).toEqual(keys.sort());
};
