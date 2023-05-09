import {getEmbeddingsBucket} from '../../src/common/utils';

const mockGetMetadata = jest.fn();
const mockCreate = jest.fn();

jest.mock('firebase-admin', () => {
  return {
    storage: () => ({
      bucket: () => ({
        getMetadata: mockGetMetadata,
        create: mockCreate,
      }),
    }),
  };
});

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'dev-extensions-testing',
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
    bucketName: 'dev-extensions-testing-ext-test-instance',
  },
}));

describe('getEmbeddingsBucket', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return the existing bucket', async () => {
    mockGetMetadata.mockResolvedValueOnce([{name: 'test'}]);

    await getEmbeddingsBucket();

    expect(mockGetMetadata).toHaveBeenCalled();
  });
});
