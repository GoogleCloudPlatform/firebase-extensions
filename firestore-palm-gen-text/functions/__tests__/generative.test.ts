import * as firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';
import config from '../src/config';
import {generateText} from '../src/index';
import {WrappedFunction} from 'firebase-functions-test/lib/v1';
import {Change} from 'firebase-functions/v1';
import {missingVariableError, variableTypeError} from '../src/errors';

process.env.GCLOUD_PROJECT = 'demo-gcp';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// // We mock out the config here instead of setting environment variables directly
jest.mock('../src/config', () => ({
  default: {
    location: 'us-central1',
    projectId: 'test-project',
    instanceId: 'test-instance',
    collectionName: 'generateTest',
    model: 'text-bison-001',
    textField: 'text',
    responseField: 'output',
    candidateCount: 1,
    candidatesField: 'candidates',
    variableFields: ['text'],
    prompt: 'Summarize this text: "{{ text }}"',
    provider: 'generative',
  },
}));

// // mock to check the arguments passed to the annotateVideo function+
const mockAPI = jest.fn();

// // Mock the video intelligence  clent
jest.mock('@google-ai/generativelanguage', () => {
  return {
    ...jest.requireActual('@google-ai/generativelanguage'),
    TextServiceClient: function mockedClient() {
      return {
        generateText: async (args: any) => {
          mockAPI(args);
          return [
            {
              candidates: [
                {
                  output: 'test response',
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

const wrappedGenerateText = fft.wrap(generateText) as WrappedFirebaseFunction;

const firestoreObserver = jest.fn();
let collectionName: string;

describe('generateText with GL', () => {
  let unsubscribe: (() => void) | undefined;

  // clear firestore
  beforeEach(async () => {
    const randomInteger = Math.floor(Math.random() * 1000000);
    collectionName = config.collectionName.replace(
      '{discussionId}',
      randomInteger.toString()
    );

    const documents = await admin
      .firestore()
      .collection(collectionName)
      .listDocuments();

    await Promise.all(documents.map(doc => doc.delete()));

    jest.clearAllMocks();

    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(collectionName)
      .onSnapshot(snap => {
        firestoreObserver(snap);
      });
  });
  afterEach(async () => {
    firestoreObserver.mockClear();
    const documents = await admin
      .firestore()
      .collection(collectionName)
      .listDocuments();

    await Promise.all(documents.map(doc => doc.delete()));
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });

  test('should not run if the text variable field is not set', async () => {
    const notMessage = {
      notText: 'this doc has no text field.',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expect(mockAPI).not.toHaveBeenCalled();
    // expect(firestoreObserver).toHaveBeenCalledTimes(3);

    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    // This is left in just so we know our observer caught everything, sanity check:
    expectKeys(firestoreCallData[0], ['notText']);
    expect(firestoreCallData[0].notText).toEqual(notMessage.notText);

    // Then we expect the function to update the status to PROCESSING:
    expectKeys(firestoreCallData[1], ['status', 'notText']);
    expect(firestoreCallData[1].status.state).toEqual('PROCESSING');

    // Then we expect the function to update the status to COMPLETE with an error:
    expectKeys(firestoreCallData[2], ['notText', 'status']);
    expect(firestoreCallData[2].status.state).toEqual('ERRORED');
    expect(firestoreCallData[2].status.error).toEqual(
      'An error occurred while processing the provided message, ' +
        missingVariableError('text').message
    );
  });

  test('should not run if the text field is not a string', async () => {
    const badMessage = {
      text: {foo: 'bar'},
    };

    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(badMessage);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    expect(mockAPI).not.toHaveBeenCalled();
    expect(firestoreObserver).toHaveBeenCalledTimes(3);

    expectKeys(firestoreCallData[0], ['text']);

    expect(firestoreCallData[0].text).toEqual(badMessage.text);

    // Then we expect the function to update the status to PROCESSING:
    expectKeys(firestoreCallData[1], ['status', 'text']);
    expect(firestoreCallData[1].status.state).toEqual('PROCESSING');

    // Then we expect the function to update the status to COMPLETE with an error:
    expectKeys(firestoreCallData[2], ['text', 'status']);
    expect(firestoreCallData[2].status.state).toEqual('ERRORED');
    expect(firestoreCallData[2].status.error).toEqual(
      'An error occurred while processing the provided message, ' +
        variableTypeError('text').message
    );
  });

  test('should not run if response field is set from the start', async () => {
    const message = {
      text: 'test chat bison',
      [config.responseField]: 'user set response for some reason',
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expectNoOp();
  });

  test('should not run if status field is set from the start', async () => {
    const message = {
      text: 'hello chat bison',
      status: {
        state: 'COMPLETED',
      },
    };
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expectNoOp();
  });

  test('should run correctly, integration test', async () => {
    const message = {
      text: 'test generate text',
    };

    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = await admin.firestore().collection(collectionName).add(message);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    // we expect the firestore observer to be called 4 times total.
    expect(firestoreObserver).toHaveBeenCalledTimes(3);

    const firestoreCallData = firestoreObserver.mock.calls.map(call =>
      call[0].docs[0].data()
    );

    // This is left in just so we know our observer caught everything, sanity check:
    expectKeys(firestoreCallData[0], ['text']);
    expect(firestoreCallData[0].text).toEqual(message.text);

    // Then we expect the function to update the status to PROCESSING:
    expectKeys(firestoreCallData[1], ['text', 'status']);
    expect(firestoreCallData[1].text).toEqual(message.text);

    expectKeys(firestoreCallData[1].status, [
      'state',
      'updateTime',
      'startTime',
    ]);
    expect(firestoreCallData[1].status.state).toEqual('PROCESSING');
    expect(firestoreCallData[1].status.updateTime).toEqual(
      expect.any(Timestamp)
    );
    const startTime = firestoreCallData[1].status.startTime;
    expect(startTime).toEqual(expect.any(Timestamp));

    // Then we expect the function to update the status to COMPLETED, with the response field populated:
    expectKeys(firestoreCallData[2], [
      'text',
      'safetyMetadata',
      'output',
      'status',
    ]);
    expect(firestoreCallData[2].text).toEqual(message.text);
    expect(firestoreCallData[2].status).toEqual({
      startTime,
      state: 'COMPLETED',
      error: null,
      completeTime: expect.any(Timestamp),
      updateTime: expect.any(Timestamp),
    });
    expect(firestoreCallData[2].output).toEqual('test response');

    // verify SDK is called with expected arguments
    const expectedRequestData = {
      candidateCount: 1,
      model: 'models/text-bison-001',
      prompt: {
        text: 'Summarize this text: "test generate text"',
      },
    };
    // we expect the mock API to be called once
    expect(mockAPI).toHaveBeenCalledTimes(1);
    expect(mockAPI).toBeCalledWith(expectedRequestData);
  });
});

const simulateFunctionTriggered =
  (wrappedFunction: WrappedFirebaseFunction, collectionName: string) =>
  async (ref: DocumentReference, before?: DocumentSnapshot) => {
    const data = (await ref.get()).data() as {[key: string]: any};
    const beforeFunctionExecution = fft.firestore.makeDocumentSnapshot(
      data,
      `${collectionName}/${ref.id}`
    ) as DocumentSnapshot;
    const change = fft.makeChange(before, beforeFunctionExecution);
    await wrappedFunction(change);
    return beforeFunctionExecution;
  };

const expectNoOp = () => {
  expect(mockAPI).toHaveBeenCalledTimes(0);
};

const expectKeys = (obj: Record<string, unknown>, keys: string[]) => {
  expect(Object.keys(obj).sort()).toEqual(keys.sort());
};
