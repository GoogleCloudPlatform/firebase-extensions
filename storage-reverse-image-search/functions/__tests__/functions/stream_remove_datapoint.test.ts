import {streamRemoveDatapoint} from '../../src/index';
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../../src/config';

const mockRemoveDatapoint = jest.fn();
const checkIndexStatus = jest.fn();

jest.mock('vertex', () => ({
  removeDatapoint: (args: unknown) => mockRemoveDatapoint(args),
  checkIndexStatus: (args: unknown) => checkIndexStatus(args),
}));

const mockGetFeatureVectors = jest.fn();

jest.mock('feature_vectors', () => ({
  getFeatureVectors: (args: unknown) => mockGetFeatureVectors(args),
}));

const mockIsImage = jest.fn();

jest.mock('utils', () => ({
  isImage: (args: unknown) => mockIsImage(args),
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

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

process.env.STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

const wrappedStreamUpdateDatapoint = fft.wrap(streamRemoveDatapoint);

describe('streamUpdateDatapoint', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // clear storage
    // await admin.storage().bucket(config.bucketName).deleteFiles({ prefix: config.path });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('example', async () => {
    const object = fft.storage.makeObjectMetadata({
      name: 'images/1.jpg',
      bucket: config.bucketName,
      contentType: 'image/jpeg',
    });
    // // put item in storage
    // await admin.storage().bucket(config.bucketName).upload("test.jpg", { destination: "images/1.jpg" });

    // // trigger function
    await wrappedStreamUpdateDatapoint(object);
  });
});
