import {getEmbeddingsBucket} from '../../src/common/utils';

const mockGetMetadata = jest.fn();
const mockCreate = jest.fn();

jest.mock('firebase-admin', () => {
  return {
    storage: () => ({
      bucket: (bucketName: string) => ({
        getMetadata: mockGetMetadata,
        create: mockCreate,
      }),
    }),
  };
});

jest.mock('../../src/config', () => ({
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
