import * as firebaseFunctionsTest from 'firebase-functions-test';
import {onIndexCreated} from '../../src/index';
import config from '../../src/config';

jest.mock('../../src/config', () => ({
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

const mockGetOperationByName = jest.fn();
const mockCreateIndexEndpoint = jest.fn();

jest.mock('../../src/common/vertex', () => ({
  createIndexEndpoint: (args: unknown) => mockCreateIndexEndpoint(args),
  getOperationByName: (args: unknown) => mockGetOperationByName(args),
}));

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

const wrappedOnIndexCreated = fft.wrap(onIndexCreated);

describe('onIndexDeployed', () => {
  test('should not run if no data', async () => {
    wrappedOnIndexCreated();
    expect(mockGetOperationByName).not.toHaveBeenCalled();
  });

  test('should not run if not last operation', async () => {
    wrappedOnIndexCreated({
      data: {
        operation: {
          last: false,
        },
      },
    });

    expect(mockGetOperationByName).not.toHaveBeenCalled();
  });

  test('should error if getOperation fails', async () => {
    mockGetOperationByName.mockImplementationOnce(() => ({
      error: 'test-error',
    }));

    try {
      wrappedOnIndexCreated({
        data: {
          operation: {
            last: true,
          },
        },
      });
    } catch (e) {
      expect(e).toEqual('test-error');
    }
  });

  test('should error if index endpoint operation errors', async () => {
    mockCreateIndexEndpoint.mockImplementationOnce(() => ({
      error: 'test-error',
    }));
    try {
      wrappedOnIndexCreated({
        data: {
          operation: {
            id: 'test-id/operation/test-test-test',
            last: true,
          },
        },
      });
    } catch (e) {
      expect(e).toEqual('test-error');
      expect(mockCreateIndexEndpoint).toHaveBeenCalled();
    }
  });
});
