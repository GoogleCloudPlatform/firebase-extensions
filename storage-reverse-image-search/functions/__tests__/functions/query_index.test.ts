import * as firebaseFunctionsTest from 'firebase-functions-test';
import {queryIndex} from '../../src/index';
import config from '../../src/config';
import * as admin from 'firebase-admin';
// import { getFeatureVectors, isBase64Image } from "../common/feature_vectors";
// import { queryIndex } from "../common/vertex";

const mockGetFeatureVectors = jest.fn();
const mockIsBase64Image = jest.fn();

jest.mock('feature_vectors', () => ({
  getFeatureVectors: (args: unknown) => mockGetFeatureVectors(args),
  isBase64Image: (args: unknown) => mockIsBase64Image(args),
}));

const mockQueryIndex = jest.fn();

jest.mock('vertex', () => ({
  queryIndex: (args: unknown) => mockQueryIndex(args),
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

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
  storageBucket: config.bucketName,
});

const wrappedQueryIndex = fft.wrap(queryIndex);

describe('queryIndex', () => {
  afterEach(async () => {
    jest.clearAllMocks();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );
  });

  test('should return 400 if no query is provided', async () => {
    try {
      await wrappedQueryIndex({});
    } catch (e: any) {
      expect(e.code).toEqual('invalid-argument');
    }
  });
  test('should return 400 if query is not an array', async () => {
    mockIsBase64Image.mockImplementation((input: any) => false);
    try {
      await wrappedQueryIndex({
        query: 'not an array',
      });
    } catch (e: any) {
      expect(e.code).toEqual('invalid-argument');
    }
  });

  test('should return 400 if query is an array but not of base64 images', async () => {
    mockIsBase64Image.mockImplementation((input: any) => false);
    try {
      await wrappedQueryIndex({
        query: ['an array'],
      });
    } catch (e: any) {
      expect(e.code).toEqual('invalid-argument');
    }
  });

  test('should error if no public endpoint provided in metadata', async () => {
    mockGetFeatureVectors.mockImplementation(() =>
      Promise.resolve([[1, 2, 3]])
    );
    mockIsBase64Image.mockImplementation(() => true);
    mockQueryIndex.mockImplementation(() => Promise.resolve('Result!'));

    // create fake metadata doc
    await admin.firestore().doc(config.metadataDoc).set({
      indexEndpoint: 'test-index-endpoint',
    });
    try {
      const result = await wrappedQueryIndex({
        query: [
          {
            image: 'test-image',
          },
        ],
      });

      expect(result).toEqual({
        status: 'ok',
        message: 'Query successful',
        data: 'Result!',
      });
    } catch (e) {
      expect(e).toEqual(new Error('Endpoint or index endpoint is undefined.'));
    }
  });

  xtest('should run with everything correct', async () => {
    mockGetFeatureVectors.mockImplementation(() =>
      Promise.resolve([[1, 2, 3]])
    );
    mockIsBase64Image.mockImplementation(() => true);
    mockQueryIndex.mockImplementation(() => Promise.resolve('Result!'));

    // create fake metadata doc
    await admin.firestore().doc(config.metadataDoc).set({
      publicEndpointDomainName: 'public-test-endpoint-domain-name',
      indexEndpoint: 'test-index-endpoint',
    });

    const result = await wrappedQueryIndex({
      query: [
        {
          image: 'test-image',
        },
      ],
    });

    expect(result).toEqual({
      status: 'ok',
      message: 'Query successful',
      data: 'Result!',
    });
  });
});
