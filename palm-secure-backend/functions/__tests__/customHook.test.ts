/* eslint-disable */
import * as firebaseFunctionsTest from 'firebase-functions-test';
import {getModel} from '../src/index';
import {HttpsError} from 'firebase-functions/v1/auth';

process.env.GCLOUD_PROJECT = 'dev-extensions-testing';

const MODEL = 'test-model';

// // // We mock out the config here instead of setting environment variables directly
jest.mock('../src/config', () => ({
  default: {
    apiKey: 'fake-api-key',
    palmEndpoint: 'generativelanguage.googleapis.com',
    apiVersion: 'v1beta2',
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'yes',
    customHookUrl: 'test-custom-hook-url',
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
global.fetch = (url: string) => {
  console.log('mock called', url);
  mock(url);
  return Promise.resolve(mockResponse);
};

const fft = firebaseFunctionsTest({
  projectId: 'dev-extensions-testing',
});

const wrappedGetModel = fft.wrap(getModel);

describe('customHook', () => {
  beforeEach(() => {
    mock.mockClear();
  });

  test('should throw if not authenticated', async () => {
    try {
      await wrappedGetModel({name: MODEL});
    } catch (e) {
      expect(e).toBeInstanceOf(HttpsError);
      const error = e as HttpsError;
      expect(error.code).toBe('unauthenticated');
    }
  });

  test('should use a custom hook', async () => {
    await wrappedGetModel({name: MODEL}, {auth: 'test'});

    expect(mock.mock.calls.length).toBe(2);
    expect(typeof mock.mock.calls[0][0]).toBe('string');

    const customHookUrl = mock.mock.calls[1][0];

    expect(customHookUrl).toBe('test-custom-hook-url');
  });
});
