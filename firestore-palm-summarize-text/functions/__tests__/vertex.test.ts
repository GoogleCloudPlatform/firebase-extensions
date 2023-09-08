import * as firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';
import config from '../src/config';
import {generateSummary} from '../src/index';
import {WrappedFunction} from 'firebase-functions-test/lib/v1';
import {Change} from 'firebase-functions/v1';

process.env.GCLOUD_PROJECT = 'demo-gcp';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// // We mock out the config here instead of setting environment variables directly
jest.mock('../src/config', () => ({
  default: {
    location: 'us-central1',
    projectId: 'test-project',
    instanceId: 'test-instance',
    collectionName: 'summariesTest/{summaryId}/messages',
    model: 'text-bison@001',
    textField: 'text',
    responseField: 'output',
    provider: 'vertex',
  },
}));

// // mock to check the arguments passed to the annotateVideo function+
const mockAPI = jest.fn();
import {helpers} from '@google-cloud/aiplatform';

jest.mock('@google-cloud/aiplatform', () => {
  return {
    ...jest.requireActual('@google-cloud/aiplatform'),
    v1: {
      PredictionServiceClient: function mockedClient() {
        return {
          predict: async (args: unknown) => {
            mockAPI(args);
            return [
              {
                predictions: [
                  helpers.toValue({
                    content: 'test response',
                  }),
                ],
              },
            ];
          },
        };
      },
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

const wrappedGenerateText = fft.wrap(
  generateSummary
) as WrappedFirebaseFunction;

const firestoreObserver = jest.fn();
let collectionName;

describe('generateText with vertex', () => {
  let unsubscribe: (() => void) | undefined;

  // clear firestore
  beforeEach(async () => {
    jest.clearAllMocks();
    const randomInteger = Math.floor(Math.random() * 1000000);
    collectionName = config.collectionName.replace(
      '{summaryId}',
      randomInteger.toString()
    );
    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(collectionName)
      .onSnapshot(snap => {
        /** There is a bug on first init and write, causing the the emulator to the observer is called twice
         * A snapshot is registered on the first run, this affects the observer count
         * This is a workaround to ensure the observer is only called when it should be
         */
        if (!snap.empty) firestoreObserver(snap);
      });
  });
  afterEach(async () => {
    const documents = await admin
      .firestore()
      .collection(collectionName)
      .listDocuments();

    await Promise.all(documents.map(doc => doc.delete()));
    if (unsubscribe && typeof unsubscribe === 'function') {
      unsubscribe();
    }
    jest.clearAllMocks();
  });

  test('should not run if the text field is not set', async () => {
    const notMessage = {
      notText: 'hello text bison. hopefully you ignore this text.',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expectNoOp();
  });

  test('should not run if the text field is empty', async () => {
    const notMessage = {
      text: '',
    };

    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expectNoOp();
  });

  test('should not run if the text field is not a string', async () => {
    const notMessage = {
      text: 123,
    };

    const ref = await admin
      .firestore()
      .collection(collectionName)
      .add(notMessage);

    await simulateFunctionTriggered(wrappedGenerateText, collectionName)(ref);

    expectNoOp();
  });

  test('should not run if response field is set from the start', async () => {
    const message = {
      text: 'hello chat bison',
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

  test('should run when given correct trigger', async () => {
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
    expectToHaveKeys(firestoreCallData[0], ['text']);
    expect(firestoreCallData[0].text).toEqual(message.text);

    // Then we expect the function to update the status to PROCESSING:
    expectToHaveKeys(firestoreCallData[1], ['text', 'status']);
    expect(firestoreCallData[1].text).toEqual(message.text);
    expectToHaveKeys(firestoreCallData[1].status, [
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
    expectToHaveKeys(firestoreCallData[2], [
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

    const prompt = {
      prompt:
        'Give a summary of the following text in undefined sentences, do not use any information that is not explicitly mentioned in the text.\n  text: test generate text\n',
    };
    const instanceValue = helpers.toValue(prompt);
    const instances = [instanceValue!];

    const parameter = {
      maxOutputTokens: 1024,
    };
    const parameters = helpers.toValue(parameter);

    // verify SDK is called with expected arguments
    const expectedRequestData = {
      endpoint:
        'projects/test-project/locations/us-central1/publishers/google/models/text-bison@001',
      instances: instances,
      parameters,
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
  expect(firestoreObserver).toHaveBeenCalledTimes(1);
  expect(mockAPI).toHaveBeenCalledTimes(0);
};

const expectToHaveKeys = (obj: Record<string, unknown>, keys: string[]) => {
  expect(Object.keys(obj).sort()).toEqual(keys.sort());
};
