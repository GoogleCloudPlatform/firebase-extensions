import {backfillTriggerHandler} from '../../src/functions/backfill_trigger';
const mockAdminBatchCommit = jest.fn();
const mockAdminBatchCreate = jest.fn();
const mockAdminDocSet = jest.fn();
const mockAdminBatchSet = jest.fn();

jest.mock('firebase-admin', () => {
  return {
    firestore: () => {
      return {
        batch: () => {
          return {
            commit: mockAdminBatchCommit,
            create: mockAdminBatchCreate,
            set: mockAdminBatchSet,
          };
        },
        doc: () => {
          return {set: mockAdminDocSet};
        },
      };
    },
  };
});

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

const mockListImagesInBucket = jest.fn();
const mockChunkArray = jest.fn();

jest.mock('utils', () => {
  return {
    listImagesInBucket: () => mockListImagesInBucket(),
    chunkArray: () => mockChunkArray(),
  };
});

const mockQueue = jest.fn();

const getFunctionsMock = () => ({
  taskQueue: () => ({
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
    path: 'images',
    modelUrl: 'test-model-url',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 256,
    bucketName: 'demo-gcp-ext-test-instance',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
    doBackfill: true,
  },
}));

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

describe('backfillTriggerHandler', () => {
  afterEach(async () => {
    jest.clearAllMocks();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
  });
  test('should handle empty objects', async () => {
    mockListImagesInBucket.mockReturnValue([]);
    await backfillTriggerHandler();

    expect(mockSetProcessingState).toHaveBeenCalled();
    expect(mockSetProcessingState).toHaveBeenCalledWith(
      'PROCESSING_WARNING',
      'No images found in the bucket. You can start uploading images to the bucket to generate embeddings.'
    );
  });

  test('should handle non-empty objects', async () => {
    const objects = [{name: 'object1', parent: {name: 'images'}}];
    mockListImagesInBucket.mockReturnValue(objects);
    mockChunkArray.mockReturnValue([objects]);

    await backfillTriggerHandler();

    expect(mockQueue).toHaveBeenCalled();
    expect(mockQueue).toHaveBeenCalledWith({
      bucket: 'test-bucket',
      id: 'ext-test-instance-task1',
      objects: ['object1'],
    });

    expect(mockSetProcessingState).toHaveBeenCalled();
    expect(mockSetProcessingState).toHaveBeenCalledWith(
      'PROCESSING_COMPLETE',
      'Successfully enqueued all tasks to backfill the data.'
    );
  });

  test('should catch and log errors', async () => {
    mockListImagesInBucket.mockImplementation(() => {
      throw new Error('An unexpected error occurred.');
    });

    try {
      await backfillTriggerHandler();
    } catch (error) {
      expect(mockLoggerError).toHaveBeenCalledWith(
        new Error('An unexpected error occurred.')
      );
    }
  });
});
