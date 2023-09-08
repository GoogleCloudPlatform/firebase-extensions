// can't wrap an onDispatch handler with fft, so we will call the actual function.
import {backfillEmbeddingsTaskHandler} from '../../src/functions/backfill_task';
import * as admin from 'firebase-admin';
import config from '../../src/config';

const mockUploadToCloudStorage = jest.fn();
const mockSaveEmbeddingsToTmpFile = jest.fn();
const mockDeleteTempFiles = jest.fn();

jest.mock('utils', () => ({
  saveEmbeddingsToTmpFile: (args: unknown) => mockSaveEmbeddingsToTmpFile(args),
  uploadToCloudStorage: (args: unknown) => mockUploadToCloudStorage(args),
  deleteTempFiles: (args: unknown) => mockDeleteTempFiles(args),
}));

//mock functions logger
const mockLogger = jest.fn();
jest.mock('firebase-functions', () => ({
  logger: {
    info: (args: unknown) => mockLogger(args),
  },
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
  },
}));

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
admin.initializeApp({
  projectId: 'demo-gcp',
});

describe('onIndexDeployed', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
  });

  test('should not run if no objects', async () => {
    const id = 'test-id';

    const taskRef = admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`);

    await taskRef.set({
      status: 'TEST',
    });
    const taskDoc = admin.firestore().doc(config.tasksDoc);
    await taskDoc.set({
      totalLength: 0,
      processedLength: 0,
    });
    const metadataDoc = admin.firestore().doc(config.metadataDoc);
    await metadataDoc.set({});

    await backfillEmbeddingsTaskHandler({
      id,
      objects: [],
    });

    expect(mockLogger).toHaveBeenCalledTimes(1);
    expect(mockLogger).toHaveBeenCalledWith('No datapoints found, skipping...');
  }, 10000);
});
