/* eslint-disable */
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../src/config';
import {getModels} from '../src/index';
import {HttpsError} from 'firebase-functions/v1/auth';

process.env.GCLOUD_PROJECT = 'demo-gcp';

const HOST = 'generativelanguage.googleapis.com';
const API_VERSION = 'v1beta2';

// // // We mock out the config here instead of setting environment variables directly
jest.mock('../src/config', () => ({
  default: {
    apiKey: 'fake-api-key',
    palmEndpoint: 'generativelanguage.googleapis.com',
    apiVersion: 'v1beta2',
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'yes',
    customHookUrl: process.env.CUSTOM_HOOK_URL,
  },
}));

const mock = jest.fn();

const mockResponse = {
  headers: new Headers({
    'Content-Type': 'application/json',
  }),
  json: () => Promise.resolve({models: ['test-model-001']}),
  ok: true,
};

//@ts-ignore
global.fetch = (url: string) => {
  console.log('mock called', url);
  mock(url);
  return Promise.resolve(mockResponse);
};

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
});

const wrappedGetModels = fft.wrap(getModels);

describe('getModels', () => {
  beforeEach(() => {
    mock.mockClear();
  });

  test('should throw if not authenticated', async () => {
    try {
      await wrappedGetModels();
    } catch (e) {
      expect(e).toBeInstanceOf(HttpsError);
      const error = e as HttpsError;
      expect(error.code).toBe('unauthenticated');
    }
  });

  test('should return a list of models', async () => {
    const res = await wrappedGetModels(undefined, {auth: {uid: '123'}});

    expect(res.models).toBeDefined();
    expect(res.models[0]).toBe('test-model-001');

    expect(mock.mock.calls.length).toBe(1);
    expect(typeof mock.mock.calls[0][0]).toBe('string');
    const url = new URL(mock.mock.calls[0][0]);

    const {protocol, host, pathname, searchParams} = url;

    expect(protocol).toBe('https:');
    expect(host).toBe(HOST);
    expect(pathname).toBe(`/${API_VERSION}/models`);
    expect(searchParams.get('key')).toBe(config.apiKey);
  });
});
