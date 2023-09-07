import {getFeatureVectors} from '../../../src/common/feature_vectors';
import * as admin from 'firebase-admin';
import config from '../../../src/config';

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'dev-extensions-testing',
    instanceId: 'test-instance',

    // User-defined vars
    path: 'images',
    modelUrl:
      'https://storage.googleapis.com/vertex-testing-1efc3.appspot.com/tfjs-model_imagenet_mobilenet_v3_large_100_224_feature_vector_5_default_1/model.json',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 224,
    bucketName: 'test-bucket',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
  },
}));

// const mockLoadGraphModel = jest.fn();
// const mockDispose = jest.fn();

// jest.mock("@tensorflow/tfjs-node", () => ({
//     ...jest.requireActual("@tensorflow/tfjs-node"),
//     loadGraphModel: (args: unknown) => mockLoadGraphModel(args),
//     dispose: () => mockDispose()
// }));

process.env.STORAGE_EMULATOR_HOST = 'http://127.0.0.1:9199';

admin.initializeApp({
  projectId: 'dev-extension-testing',
  storageBucket: config.bucketName,
});

describe('getFeatureVectors', () => {
  afterEach(async () => {
    jest.clearAllMocks();
    // clear storage
    await admin
      .storage()
      .bucket(config.bucketName)
      .deleteFiles({prefix: config.path});
  });

  test('should return empty array if passed empty array', async () => {
    const featureVectors = await getFeatureVectors([]);
    expect(featureVectors).toEqual([]);
  });

  test('should run', async () => {
    const testImagePath = __dirname + '/test-image.png';
    const imagePathInStorage = config.path + '/test-image.png';

    await admin.storage().bucket(config.bucketName).upload(testImagePath, {
      destination: imagePathInStorage,
    });

    const featureVectors = await getFeatureVectors([imagePathInStorage]);
    //expect to be same length as model output
    expect(featureVectors[0].length).toBe(1280);
    // expect to be array of floats

    for (let i = 0; i < featureVectors[0].length; i++) {
      expect(typeof featureVectors[0][i]).toBe('number');
    }
  }, 20000);
});
