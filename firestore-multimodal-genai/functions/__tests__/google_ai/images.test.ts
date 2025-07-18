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
import {expectToError, expectToProcessCorrectly} from '../util';
import {imageMock} from '../fixtures/imageMock';
import {Part} from '@google/generative-ai';

// Type definitions for improved code clarity
type DocumentData = admin.firestore.DocumentData;
type WrappedGenerateText = WrappedFunction<
  Change<DocumentSnapshot | undefined>,
  void
>;

// Configure test environment
process.env.GCLOUD_PROJECT = 'demo-gcp';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

// Mock Firebase Functions logger
const mockFunctionsLoggerError = jest.fn();

jest.mock('firebase-functions', () => ({
  ...jest.requireActual('firebase-functions'),
  logger: {
    error: (x: any) => mockFunctionsLoggerError(x),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock configuration with image support
jest.mock('../../src/config', () => ({
  default: {
    googleAi: {
      model: 'gemini-2.5-pro',
      apiKey: 'test-api-key',
    },
    vertex: {model: 'gemini-2.5-pro'},
    model: 'gemini-2.5-pro',
    collectionName: 'generate',
    location: 'us-central1',
    prompt: '{{ instruction }}',
    variableFields: ['instruction'],
    responseField: 'output',
    projectId: 'demo-gcp',
    instanceId: 'demo-test',
    imageField: 'image',
    provider: 'google-ai',
    candidates: {
      field: 'candidates',
      count: 2,
      shouldIncludeCandidatesField: true,
    },
  },
}));

// Mock dependencies
const mockGenerativeAI = {
  getClient: jest.fn(),
  getModel: jest.fn(),
  generateContent: jest.fn(),
};

const mockImageUtils = {
  getImageBase64: jest.fn(),
};

// Configure mocks
jest.mock('../../src/generative-client/image_utils', () => ({
  ...jest.requireActual('../../src/generative-client/image_utils'),
  getImageBase64: async () => mockImageUtils.getImageBase64(),
}));

jest.mock('@google/generative-ai', () => ({
  ...jest.requireActual('@google/generative-ai'),
  GoogleGenerativeAI: function (apiKey: string) {
    mockGenerativeAI.getClient(apiKey);
    return {
      getGenerativeModel: (args: unknown) => {
        mockGenerativeAI.getModel(args);
        return {
          generateContent: async (args: unknown) => {
            mockGenerativeAI.generateContent(args);
            return {
              response: {
                candidates: [
                  {
                    content: {
                      parts: [{text: 'test response'}],
                    },
                  },
                  {
                    content: {
                      parts: [{text: 'test response'}],
                    },
                  },
                ],
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

  const verifyApiCalls = (expectedText: string, expectedImage?: string) => {
    expect(mockGenerativeAI.getClient).toHaveBeenCalledWith(
      config.googleAi.apiKey
    );
    expect(mockGenerativeAI.getModel).toHaveBeenCalledWith({
      model: config.googleAi.model,
    });

    const expectedParts: Part[] = [{text: expectedText}];
    if (expectedImage) {
      expectedParts.push({
        inlineData: {
          mimeType: 'image/png',
          data: expectedImage,
        },
      });
    }

    expect(mockGenerativeAI.generateContent).toHaveBeenCalledWith({
      contents: [
        {
          parts: expectedParts,
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
  };

  // Setup before each test
  beforeEach(async () => {
    // Initialize test environment
    jest.resetAllMocks();
    fft = firebaseFunctionsTest({projectId: 'demo-gcp'});

    if (!admin.apps.length) {
      admin.initializeApp({projectId: 'demo-gcp'});
    }

    // Clear Firestore
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );

    // Setup collection and wrapped function
    const randomId = Math.floor(Math.random() * 1000000);
    collectionName = config.collectionName.replace(
      '{discussionId}',
      randomId.toString()
    );
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

      expect(mockFunctionsLoggerError).toHaveBeenCalledTimes(1);
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          "[firestore-multimodal-genai] Error calling Gemini API for document 'generate/"
        )
      );
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error substituting handlebar variables into prompt. Does your document contain the field "instruction"?'
        )
      );
    });

    test('should not process when prompt field is empty', async () => {
      const ref = await admin
        .firestore()
        .collection(collectionName)
        .add({instruction: ''});

      await simulateFunctionTrigger(ref);
      await expectNoProcessing();

      expect(mockFunctionsLoggerError).toHaveBeenCalledTimes(1);
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          "[firestore-multimodal-genai] Error calling Gemini API for document 'generate/"
        )
      );
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error substituting handlebar variables into prompt. Does your document contain the field "instruction"?'
        )
      );
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

      expectToError(
        firestoreCallData,
        message,
        'An error occurred while processing the provided message, Error substituting variable "instruction" variables into prompt. All variable fields must be strings'
      );

      expect(mockFunctionsLoggerError).toHaveBeenCalledTimes(1);
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          "[firestore-multimodal-genai] Error calling Gemini API for document 'generate/"
        )
      );
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error substituting variable "instruction" variables into prompt. All variable fields must be strings'
        )
      );
    });

    test('should error when image field is missing with vision model', async () => {
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

      expectToError(
        firestoreCallData,
        message,
        'An error occurred while processing the provided message, Vision model selected, but missing Image Field'
      );

      expect(mockFunctionsLoggerError).toHaveBeenCalledTimes(1);
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          "[firestore-multimodal-genai] Error calling Gemini API for document 'generate/"
        )
      );
      expect(mockFunctionsLoggerError).toHaveBeenCalledWith(
        expect.stringContaining(
          'Vision model selected, but missing Image Field'
        )
      );
    });
  });

  describe('Successful Processing', () => {
    beforeEach(() => {
      mockImageUtils.getImageBase64.mockResolvedValue(imageMock);
    });

    test('should process message with createTime and image', async () => {
      const message = {
        instruction: 'hello gemini',
        createTime: admin.firestore.Timestamp.now(),
        image: 'gs://test-bucket/test-image.png',
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
      verifyApiCalls(message.instruction, imageMock);

      expect(mockFunctionsLoggerError).not.toHaveBeenCalled();
    });

    test('should process message without createTime but with image', async () => {
      const message = {
        instruction: 'hello gemini',
        image: 'gs://test-bucket/test-image.png',
      };

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
      verifyApiCalls(message.instruction, imageMock);

      expect(mockFunctionsLoggerError).not.toHaveBeenCalled();
    });
  });
});
