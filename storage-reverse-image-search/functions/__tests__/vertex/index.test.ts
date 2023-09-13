const mockCreateIndex = jest.fn();
const mockCreateIndexEndpoint = jest.fn();
const mockDeployIndex = jest.fn();

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

jest.mock('@google-cloud/aiplatform', () => ({
  v1beta1: {
    IndexServiceClient: jest.fn(() => ({
      createIndex: () => [mockCreateIndex()],
      createIndexEndpoint: (args: unknown) => [mockCreateIndexEndpoint(args)],
      deployIndex: (args: unknown) => mockDeployIndex(args),
    })),
    IndexEndpointServiceClient: jest.fn(() => ({
      createIndex: () => [mockCreateIndex()],
      createIndexEndpoint: (args: unknown) => [mockCreateIndexEndpoint(args)],
      deployIndex: (args: unknown) => [mockDeployIndex(args)],
    })),
  },
  protos: {
    google: {
      cloud: {
        aiplatform: {
          v1: {AcceleratorType: {ACCELERATOR_TYPE_UNSPECIFIED: 0}},
        },
      },
    },
  },
}));

jest.mock('google-gax', () => ({}));

const mockGetClient = jest.fn();
const mockCloudResourceManager = jest.fn();
const mockProjectsGet = jest.fn();

jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        getClient: (args: unknown) => mockGetClient(args),
      },
      cloudresourcemanager: (args: unknown) => {
        mockCloudResourceManager(args);
        return {
          projects: {
            get: (args: unknown) => mockProjectsGet(args),
          },
        };
      },
    },
  };
});

jest.mock('google-auth-library', () => ({
  GoogleAuth: jest.fn().mockImplementation(() => {
    return {
      getClient: jest.fn().mockReturnValue({
        getAccessToken: jest.fn(),
      }),
    };
  }),
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
      Promise.resolve({error: new Error('test error')})
    );
    try {
      createIndex(100);
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
      Promise.resolve({error: new Error('test error')})
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
      Promise.resolve({error: new Error('test error')})
    );

    try {
      deployIndex('test-endpoint', 'test-index');
    } catch (e: any) {
      expect(e.message).toEqual('test error');
    }
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
        neighbor_count: 1,
        queries: [
          {
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
