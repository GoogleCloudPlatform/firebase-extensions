import * as admin from 'firebase-admin';
import config from '../../src/config';
import {backfillTriggerHandler} from '../../src/functions/backfill_trigger';

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock('firebase-functions', () => {
  return {
    logger: {
      info: (args: unknown) => mockLoggerInfo(args),
      error: (args: unknown) => mockLoggerError(args),
    },
  };
});

const mockQueue = jest.fn();

const getFunctionsMock = () => ({
  taskQueue: (functionName: string, instanceId: string) => ({
    enqueue: (data: any) => {
      mockQueue(data);
      return Promise.resolve();
    },
  }),
});

const mockSetProcessingState = jest.fn();

const getExtensionsMock = () => ({
  runtime: () => ({
    setProcessingState: (state: string, message: string) =>
      mockSetProcessingState(state, message),
  }),
});

jest.mock('firebase-admin/functions', () => ({
  ...jest.requireActual('firebase-admin/functions'),
  getFunctions: () => getFunctionsMock(),
}));

jest.mock('firebase-admin/extensions', () => ({
  ...jest.requireActual('firebase-admin/extensions'),
  getExtensions: () => getExtensionsMock(),
}));

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',

    // User-defined vars
    collectionName: 'test-collection',
    embeddingMethod: 'use',
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    featureNormType: 'NONE',
    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
    dimensions: 512,
    bucketName: 'demo-gcp-ext-test-instance',
  },
}));

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

admin.initializeApp();

const firestoreObserver = jest.fn();

describe('backfillTriggerHandler', () => {
  let unsubscribe: () => void;
  beforeEach(async () => {
    jest.resetAllMocks();
    firestoreObserver.mockReset();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(config.tasksDoc.split('/')[0])
      .onSnapshot(snap => {
        firestoreObserver(snap);
      });
  });
  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    jest.resetAllMocks();
    firestoreObserver.mockReset();
    firestoreObserver.mockClear();
  });
  test('should handle non-existing collection ', async () => {
    await backfillTriggerHandler({});

    expect(mockQueue).not.toHaveBeenCalled();
  });
});
