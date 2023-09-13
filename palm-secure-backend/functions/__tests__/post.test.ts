/* eslint-disable */
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../src/config';
import {post} from '../src/index';
import {HttpsError} from 'firebase-functions/v1/auth';

process.env.GCLOUD_PROJECT = 'demo-gcp';

const HOST = 'generativelanguage.googleapis.com';
const API_VERSION = 'v1beta2';
const MODEL = 'test-model';

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
  json: () => Promise.resolve({}),
  ok: true,
};

//@ts-ignore
global.fetch = (url: string, options) => {
  console.log('mock called', url);
  mock(url, options);
  return Promise.resolve(mockResponse);
};

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
});

const wrappedPost = fft.wrap(post);

describe('post', () => {
  beforeEach(() => {
    mock.mockClear();
  });

  test('should throw if not authenticated', async () => {
    try {
      await wrappedPost({model: 'test', method: 'test'});
    } catch (e) {
      expect(e).toBeInstanceOf(HttpsError);
      const error = e as HttpsError;
      expect(error.code).toBe('unauthenticated');
    }
  });

  test('should do post', async () => {
    const res = await wrappedPost(
      {model: MODEL, method: 'test', foo: 'bar'},
      {auth: 'test'}
    );

    expect(mock.mock.calls.length).toBe(1);
    expect(typeof mock.mock.calls[0][0]).toBe('string');
    const url = new URL(mock.mock.calls[0][0]);
    const options = mock.mock.calls[0][1];

    const {protocol, host, pathname, searchParams} = url;

    expect(protocol).toBe('https:');
    expect(host).toBe(HOST);
    expect(pathname).toBe(`/${API_VERSION}/models/${MODEL}:test`);
    expect(searchParams.get('key')).toBe(config.apiKey);

    expect(options).toBeDefined();
    expect(options.method).toBe('POST');
    expect(options.headers).toBeDefined();
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.body).toBeDefined();
    expect(options.body).toBe(JSON.stringify({foo: 'bar'}));
  });
});
