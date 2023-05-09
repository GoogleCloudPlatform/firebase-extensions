/* eslint-disable */
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../src/config';
import {getModel} from '../src/index';
import {RequestInfo, RequestInit} from 'node-fetch';
import {HttpsError} from 'firebase-functions/v1/auth';

process.env.GCLOUD_PROJECT = 'dev-extensions-testing';

const HOST = 'generativelanguage.googleapis.com';
const API_VERSION = 'v1beta2';
const MODEL = 'test-model';

// // // We mock out the config here instead of setting environment variables directly
jest.mock('../src/config', () => ({
  default: {
    apiKey: 'fake-api-key',
  },
}));

const mock = jest.fn();

const mockFetch = (url: RequestInfo, init?: RequestInit) => {
  mock(url, init);
  if (typeof url !== 'string') {
    throw new Error('url passed into mock is not string');
  }
  const urlObject = new URL(url as string);

  if (urlObject.pathname === `/${API_VERSION}/models/${MODEL}`) {
    return {
      status: 200,
      json: () => {
        return {
          model: 'test',
        };
      },
    };
  } else {
    throw new Error('bad url');
  }
};

jest.mock('node-fetch', () => ({
  default: (url: RequestInfo, init?: RequestInit) => mockFetch(url, init),
}));

const fft = firebaseFunctionsTest({
  projectId: 'dev-extensions-testing',
});

const wrappedGetModel = fft.wrap(getModel);

describe('getModels', () => {
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

  test('should return a list of models', async () => {
    const res = await wrappedGetModel({name: MODEL}, {auth: 'test'});
    expect(res.model).toBeDefined();
    expect(res.model).toBe('test');

    expect(mock.mock.calls.length).toBe(1);
    expect(typeof mock.mock.calls[0][0]).toBe('string');
    const url = new URL(mock.mock.calls[0][0]);

    const {protocol, host, pathname, searchParams} = url;

    expect(protocol).toBe('https:');
    expect(host).toBe(HOST);
    expect(pathname).toBe(`/${API_VERSION}/models/${MODEL}`);
    expect(searchParams.get('key')).toBe(config.apiKey);
  });
});
