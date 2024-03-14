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
    collectionName: 'discussionsTestGenerative/{discussionId}/messages',
    location: 'us-central1',
    orderField: 'createTime',
    promptField: 'prompt',
    responseField: 'response',
    enableDiscussionOptionOverrides: true,
    candidatesField: 'candidates',
    provider: 'generative',
    model: 'chat-bison',
    context: 'Speak like Shakespeare',
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
  test('should call API with context if it is set', async () => {
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
      model: 'models/chat-bison',
      prompt: {
        messages: [
          {
            author: '0',
            content: 'hello chat bison',
          },
        ],
        context: 'Speak like Shakespeare',
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

  test('should override context with parent document field if set', async () => {
    const message = {
      prompt: 'hello chat bison',
      createTime: Timestamp.now(),
    };

    //  we override the context, it should be used instead of extension context
    const discussionDocument = collectionName.replace('/messages', '');

    await admin.firestore().doc(discussionDocument).set({
      context: 'Do not speak like Shakespeare please.',
    });

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
      model: 'models/chat-bison',
      prompt: {
        messages: [
          {
            author: '0',
            content: 'hello chat bison',
          },
        ],
        context: 'Do not speak like Shakespeare please.',
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

const expectToHaveKeys = (obj: Record<string, unknown>, keys: string[]) => {
  expect(Object.keys(obj).sort()).toEqual(keys.sort());
};
