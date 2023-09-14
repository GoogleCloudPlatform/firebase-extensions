const mockCreateIndex = jest.fn();
const mockCreateIndexEndpoint = jest.fn();
const mockDeployIndex = jest.fn();


import * as admin from 'firebase-admin';
import config from '../../src/config';

import {checkIndexStatus} from '../../src/common/vertex';

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
admin.initializeApp({projectId: 'demo-gcp'});

jest.mock('../../src/config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
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


describe('checkIndexStatus', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
  });

  test('should return status of metadata document', async () => {
    await admin.firestore().doc(config.metadataDoc).set({
      status: 'test-status',
    });

    const result = await checkIndexStatus();

    expect(result).toEqual({status: 'test-status'});
  });
});
