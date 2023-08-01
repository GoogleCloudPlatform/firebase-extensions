import * as firebaseFunctionsTest from 'firebase-functions-test';
import {queryIndex} from '../../src/index';
import config from '../../src/config';
import * as admin from 'firebase-admin';

const mockQueryIndex = jest.fn();

jest.mock('vertex', () => ({
  queryIndex: (args: unknown) => mockQueryIndex(args),
}));

const mockGetEmbeddings = jest.fn().mockImplementation(() => {
  return [[1, 2, 3]];
});

jest.mock('datapoints', () => ({
  getEmbeddings: (args: unknown) => mockGetEmbeddings(args),
}));

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

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const fft = firebaseFunctionsTest({
  projectId: 'dev-extensions-testing',
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
  test('should return 400 if query is not a string', async () => {
    try {
      await wrappedQueryIndex({
        query: 123,
      });
    } catch (e: any) {
      expect(e.code).toEqual('invalid-argument');
    }
  });

  test('should error if no public endpoint provided in metadata', async () => {
    // mockGetFeatureVectors.mockImplementation(() => Promise.resolve([[1, 2, 3]]));
    // mockIsBase64Image.mockImplementation(() => true);
    mockQueryIndex.mockImplementation(() => Promise.resolve('Result!'));

    // create fake metadata doc
    await admin.firestore().doc(config.metadataDoc).set({
      indexEndpoint: 'test-index-endpoint',
    });

    try {
      await wrappedQueryIndex({
        query: ['test query'],
      });
    } catch (e) {
      expect(e).toEqual(new Error('Endpoint or index endpoint is not found.'));
    }
  });

  test('should run with everything correct', async () => {
    // mockGetFeatureVectors.mockImplementation(() => Promise.resolve([[1, 2, 3]]));
    // mockIsBase64Image.mockImplementation(() => true);
    mockQueryIndex.mockImplementation(() => Promise.resolve('Result!'));

    // create fake metadata doc
    await admin.firestore().doc(config.metadataDoc).set({
      publicEndpointDomainName: 'public-test-endpoint-domain-name',
      indexEndpoint: 'test-index-endpoint',
    });

    const result = await wrappedQueryIndex({
      query: ['test query'],
    });

    expect(result).toEqual({
      status: 'ok',
      message: 'Query successful',
      data: 'Result!',
    });
  });
});
