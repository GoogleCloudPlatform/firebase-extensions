import * as firebaseFunctionsTest from 'firebase-functions-test';
import {onIndexDeployed} from '../../src/index';
import config from '../../src/config';

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

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

const mockGetDeployedIndex = jest
  .fn()
  .mockImplementation(() => 'test-index-endpoint.com');

jest.mock('vertex', () => ({
  getDeployedIndex: () => mockGetDeployedIndex(),
}));

const wrappedOnIndexDeployed = fft.wrap(onIndexDeployed);

describe('onIndexDeployed', () => {
  test('should not run if no operation', async () => {
    await wrappedOnIndexDeployed();
    expect(mockGetDeployedIndex).not.toHaveBeenCalled();
  });

  test('should not run if not last operation', async () => {
    wrappedOnIndexDeployed({
      data: {
        operation: {
          last: false,
        },
      },
    });
  });
});
