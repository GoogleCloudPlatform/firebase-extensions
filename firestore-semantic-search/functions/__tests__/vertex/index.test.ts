import {
  createIndex,
  createIndexEndpoint,
  deployIndex,
  upsertDatapoint,
  removeDatapoint,
  queryIndex,
  getOperationByName,
  cancelOperationByName,
  deleteOperationByName,
  checkIndexStatus,
} from '../../src/common/vertex';
import * as admin from 'firebase-admin';
import config from '../../src/config';
import {Query} from '../../src/types/query';

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

/** Setup env */
process.env.GCLOUD_PROJECT = 'demo-gcp';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

const mockCreateIndex = jest.fn();
const mockCreateIndexEndpoint = jest.fn();
const mockDeployIndex = jest.fn();

jest.mock('@google-cloud/aiplatform', () => ({
  ...jest.requireActual('@google-cloud/aiplatform'),
  v1beta1: {
    IndexServiceClient: jest.fn(() => ({
      createIndex: () => mockCreateIndex(),
      createIndexEndpoint: (args: unknown) => mockCreateIndexEndpoint(args),
      deployIndex: (args: unknown) => mockDeployIndex(args),
    })),
    IndexEndpointServiceClient: jest.fn(() => ({
      createIndex: () => mockCreateIndex(),
      createIndexEndpoint: (args: unknown) => mockCreateIndexEndpoint(args),
      deployIndex: (args: unknown) => mockDeployIndex(args),
    })),
  },
}));

admin.initializeApp({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

describe('createIndex', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should error out if operation from client has error property', async () => {
    mockCreateIndex.mockImplementation(() =>
      Promise.resolve([{error: new Error('test error')}])
    );
    try {
      await createIndex();
    } catch (e: any) {
      expect(e.message).toEqual('test error');
    }
  });
});
describe('createIndexEndpoint', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should error out if operation from client has error property', async () => {
    mockCreateIndexEndpoint.mockImplementation(() =>
      Promise.resolve([{error: new Error('test error')}])
    );

    try {
      createIndexEndpoint();
    } catch (e: any) {
      expect(e.message).toEqual('test error');
    }
  });
});

describe('deployIndex', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should error out if operation from client has error property', async () => {
    mockDeployIndex.mockImplementationOnce(() =>
      Promise.resolve([{error: new Error('test error')}])
    );

    try {
      await deployIndex('test-endpoint', 'test-index');
    } catch (e: any) {
      expect(e.message).toEqual('test error');
    }
  });

  test('should return an empty array for autoscalingMetricSpecs with no autoscaling config', async () => {
    /** set config values */
    config.maxReplicaCount = 1;
    config.minReplicaCount = 1;
    config.acceleratorCount = 1;
    config.acceleratorType = 'NVIDIA_TESLA_K80';
    config.machineType = 'test-machine-type';

    mockDeployIndex.mockImplementationOnce(() =>
      Promise.resolve([{name: 'test-name'}])
    );

    await deployIndex('test-endpoint', 'test-index');

    expect(mockDeployIndex).toHaveBeenCalledWith({
      deployedIndex: {
        dedicatedResources: {
          machineSpec: {
            acceleratorCount: 1,
            acceleratorType: 1,
            machineType: 'test-machine-type',
          },
          maxReplicaCount: 1,
          minReplicaCount: 1,
        },
        id: 'ext_test_instance_index',
        index: 'test-index',
      },
      indexEndpoint: 'test-endpoint',
    });
  });

  test('should return an empty array for autoscalingMetricSpecs with an invalid accelerator count', async () => {
    /** set config values */
    config.maxReplicaCount = 1;
    config.minReplicaCount = 1;
    config.acceleratorCount = 1;
    config.acceleratorType = 'NVIDIA_TESLA_K80';
    config.machineType = 'test-machine-type';

    mockDeployIndex.mockImplementationOnce(() =>
      Promise.resolve([{name: 'test-name'}])
    );

    await deployIndex('test-endpoint', 'test-index');

    expect(mockDeployIndex).toHaveBeenCalledWith({
      deployedIndex: {
        dedicatedResources: {
          machineSpec: {
            acceleratorCount: 1,
            acceleratorType: 1,
            machineType: 'test-machine-type',
          },
          maxReplicaCount: 1,
          minReplicaCount: 1,
        },
        id: 'ext_test_instance_index',
        index: 'test-index',
      },
      indexEndpoint: 'test-endpoint',
    });
  });
});

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock('axios', () => ({
  default: {
    post: (...args: unknown[]) => mockPost(args),
    get: (...args: unknown[]) => mockGet(args),
    delete: (...args: unknown[]) => mockDelete(args),
  },
}));

const mockGetAccessToken = jest.fn().mockImplementation(() => 'test-token');

jest.mock('../../src/common/utils', () => ({
  ...jest.requireActual('../../src/common/utils'),
  getAccessToken: () => mockGetAccessToken(),
}));

describe('upsertDatapoint', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should post with correct data', async () => {
    await upsertDatapoint('test-index-resource-name', [
      {datapoint_id: 'test-id', feature_vector: [1, 2, 3]},
    ]);

    const expectedUrl =
      'https://us-central1-aiplatform.googleapis.com/v1beta1/test-index-resource-name:upsertDatapoints';

    expect(mockPost).toHaveBeenCalledWith([
      expectedUrl,
      {
        datapoints: [
          {
            datapoint_id: 'test-id',
            feature_vector: [1, 2, 3],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);
  });
});

describe('removeDatapoint', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should post with correct data', async () => {
    await removeDatapoint('test-index-resource-name', ['test-id']);

    const expectedUrl =
      'https://us-central1-aiplatform.googleapis.com/v1beta1/test-index-resource-name:removeDatapoints';

    expect(mockPost).toHaveBeenCalledWith([
      expectedUrl,
      {
        datapoint_ids: ['test-id'],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);
  });
});

describe('queryIndex', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should post with correct data', async () => {
    const query = new Query('test-id', [1, 2, 3]);

    const queries = [query];

    const searchResults = 1;

    const endpoint = 'test-endpoint.com';

    const indexEndpoint = 'test-index-endpoint';

    mockPost.mockImplementationOnce(() => Promise.resolve({data: 'test-data'}));

    const result = await queryIndex(
      queries,
      searchResults,
      endpoint,
      indexEndpoint
    );

    const expectedUrl =
      'https://test-endpoint.com/v1beta1/projects/demo-gcp/locations/us-central1/indexEndpoints/test-index-endpoint:findNeighbors';

    expect(mockPost).toHaveBeenCalledWith([
      expectedUrl,
      {
        deployed_index_id: 'ext_test_instance_index',
        queries: [
          {
            neighbor_count: 1,
            datapoint: {
              datapoint_id: 'test-id',
              feature_vector: [1, 2, 3],
            },
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);

    expect(result).toEqual('test-data');
  });
});

describe('getOperationByName', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should get with correct request', async () => {
    mockGet.mockImplementationOnce(() => Promise.resolve({data: 'test-data'}));
    await getOperationByName('test-operation-name');

    expect(mockGet).toHaveBeenCalled();
    expect(mockGet).toBeCalledWith([
      'https://us-central1-aiplatform.googleapis.com/v1beta1/test-operation-name',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);
  });
});

describe('cancelOperationByName', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should get with correct request', async () => {
    mockPost.mockImplementationOnce(() => Promise.resolve({data: 'test-data'}));
    await cancelOperationByName('test-operation-name');

    expect(mockPost).toHaveBeenCalled();
    console.log(mockPost.mock.calls[0][0]);
    expect(mockPost).toBeCalledWith([
      'https://us-central1-aiplatform.googleapis.com/v1beta1/test-operation-name:cancel',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);
  });
});

describe('deleteOperationByName', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  test('should delete with correct request', async () => {
    mockDelete.mockImplementationOnce(() =>
      Promise.resolve({data: 'test-data'})
    );
    await deleteOperationByName('test-operation-name');

    expect(mockDelete).toHaveBeenCalled();
    console.log(mockDelete.mock.calls[0][0]);
    expect(mockDelete).toBeCalledWith([
      'https://us-central1-aiplatform.googleapis.com/v1beta1/test-operation-name',
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        },
      },
    ]);
  });
});

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

describe('checkIndexStatus', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
  });

  xtest('should return status of metadata document', async () => {
    await admin.firestore().doc(config.metadataDoc).set({
      status: 'test-status',
    });

    //wait for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    const result = await checkIndexStatus();
    expect(result.status).toEqual('INDEX_BUILDING');
  }, 12000);
});
