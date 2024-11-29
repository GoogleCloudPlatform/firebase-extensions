import * as firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';
import {
  DocumentReference,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase-admin/firestore';
import {Change} from 'firebase-functions/v1';
import {WrappedFunction} from 'firebase-functions-test/lib/v1';
import waitForExpect from 'wait-for-expect';

import config from '../../src/config';
import {generateText} from '../../src/index';
import {expectToProcessCorrectly} from '../util';

type DocumentData = admin.firestore.DocumentData;
type WrappedGenerateText = WrappedFunction<
  Change<DocumentSnapshot | undefined>,
  void
>;

// Configure test environment
process.env.GCLOUD_PROJECT = 'demo-gcp';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Mock configuration
jest.mock('../../src/config', () => ({
  default: {
    googleAi: {
      model: 'gemini-1.0-pro',
      apiKey: 'test-api-key',
    },
    vertex: {model: 'gemini-1.0-pro'},
    model: 'gemini-1.0-pro',
    collectionName: 'generate',
    location: 'us-central1',
    prompt: '{{ instruction }}',
    variableFields: ['instruction'],
    responseField: 'output',
    projectId: 'demo-test',
    instanceId: 'demo-test',
    provider: 'google-ai',
    candidates: {
      field: 'candidates',
      count: 2,
      shouldIncludeCandidatesField: true,
    },
  },
}));

// Mock Google AI client
const mockGenerativeAI = {
  getClient: jest.fn(),
  getModel: jest.fn(),
  generateContent: jest.fn(),
};

jest.mock('@google/generative-ai', () => ({
  ...jest.requireActual('@google/generative-ai'),
  GoogleGenerativeAI: function (apiKey: string) {
    mockGenerativeAI.getClient(apiKey);
    return {
      getGenerativeModel: (args: unknown) => {
        mockGenerativeAI.getModel(args);
        return {
          generateContent: (args: unknown) => {
            mockGenerativeAI.generateContent(args);
            return {
              response: {
                candidates: Array(2).fill({
                  content: {
                    parts: [{text: 'test response'}],
                  },
                }),
              },
            };
          },
        };
      },
    };
  },
}));

describe('Generate Text Function Tests', () => {
  // Test setup variables
  let fft: ReturnType<typeof firebaseFunctionsTest>;
  let wrappedGenerateText: WrappedGenerateText;
  let unsubscribe: () => void;
  let collectionName: string;
  const firestoreObserver = jest.fn();

  // Helper functions
  const simulateFunctionTrigger = async (
    ref: DocumentReference,
    before?: DocumentSnapshot
  ): Promise<DocumentSnapshot> => {
    const data = (await ref.get()).data() as DocumentData;
    const snapshot = fft.firestore.makeDocumentSnapshot(
      data,
      `${collectionName}/${ref.id}`
    ) as DocumentSnapshot;
    const change = fft.makeChange(before, snapshot);
    await wrappedGenerateText(change);
    return snapshot;
  };

  const expectNoProcessing = async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(mockGenerativeAI.getModel).not.toHaveBeenCalled();
  };

  // Setup before each test
  beforeEach(async () => {
    // Initialize test environment
    fft = firebaseFunctionsTest({projectId: 'demo-gcp'});
    if (!admin.apps.length) {
      admin.initializeApp({projectId: 'demo-gcp'});
    }

    // Clear Firestore
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );

    // Reset mocks and setup collection
    jest.clearAllMocks();
    const randomId = Math.floor(Math.random() * 1000000);
    collectionName = config.collectionName.replace(
      '{discussionId}',
      randomId.toString()
    );

    // Initialize wrapped function
    wrappedGenerateText = fft.wrap(generateText) as WrappedGenerateText;

    // Setup Firestore observer
    unsubscribe = admin
      .firestore()
      .collection(collectionName)
      .onSnapshot((snap: QuerySnapshot) => {
        if (snap.docs.length) firestoreObserver(snap);
      });
  });

  afterEach(() => {
    unsubscribe?.();
    jest.clearAllMocks();
  });

  describe('Input Validation', () => {
    test('should not process when prompt field is missing', async () => {
      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add({notPrompt: 'hello chat bison'});

      await simulateFunctionTrigger(ref);
      await expectNoProcessing();
    });

    test('should not process when prompt field is empty', async () => {
      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add({prompt: ''});

      await simulateFunctionTrigger(ref);
      await expectNoProcessing();
    });

    test('should error when prompt field is not a string', async () => {
      const message = {instruction: 123};
      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add(message);

      await simulateFunctionTrigger(ref);

      await waitForExpect(() => {
        expect(firestoreObserver).toHaveBeenCalledTimes(3);
      });

      const firestoreCallData = firestoreObserver.mock.calls.map(call =>
        call[0].docs[0].data()
      );

      expect(firestoreCallData[2]).toMatchObject({
        status: {
          state: 'ERRORED',
          error: expect.stringContaining('All variable fields must be strings'),
        },
      });
    });
  });

  describe('Successful Processing', () => {
    test('should process message with createTime', async () => {
      const message = {
        instruction: 'hello gemini',
        createTime: admin.firestore.Timestamp.now(),
      };

      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add(message);

      await simulateFunctionTrigger(ref);

      await waitForExpect(() => {
        expect(firestoreObserver).toHaveBeenCalledTimes(3);
      });

      const firestoreCallData = firestoreObserver.mock.calls.map(call =>
        call[0].docs[0].data()
      );

      expectToProcessCorrectly(firestoreCallData, message, 'test response', 2);

      // Verify API calls
      expect(mockGenerativeAI.getClient).toHaveBeenCalledWith(
        config.googleAi.apiKey
      );
      expect(mockGenerativeAI.getModel).toHaveBeenCalledWith({
        model: config.googleAi.model,
      });
      expect(mockGenerativeAI.generateContent).toHaveBeenCalledWith({
        contents: [
          {
            parts: [{text: 'hello gemini'}],
            role: 'user',
          },
        ],
        generationConfig: {
          candidateCount: undefined,
          maxOutputTokens: undefined,
          temperature: undefined,
          topK: undefined,
          topP: undefined,
        },
      });
    });

    test('should process message without createTime', async () => {
      const message = {instruction: 'hello gemini'};
      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add(message);

      const beforeSnapshot = await simulateFunctionTrigger(ref);
      await simulateFunctionTrigger(ref, beforeSnapshot);

      await waitForExpect(() => {
        expect(firestoreObserver).toHaveBeenCalledTimes(3);
      });

      const firestoreCallData = firestoreObserver.mock.calls.map(call =>
        call[0].docs[0].data()
      );

      expectToProcessCorrectly(firestoreCallData, message, 'test response', 2);

      // Verify API calls
      expect(mockGenerativeAI.getClient).toHaveBeenCalledWith(
        config.googleAi.apiKey
      );
      expect(mockGenerativeAI.getModel).toHaveBeenCalledWith({
        model: config.googleAi.model,
      });
      expect(mockGenerativeAI.generateContent).toHaveBeenCalledTimes(1);
    });
  });
});
