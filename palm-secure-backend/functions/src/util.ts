/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as functions from 'firebase-functions/v2';
import fetch, {Response, RequestInit} from 'node-fetch';
import {HttpsError} from 'firebase-functions/v1/https';
import {FunctionsErrorCode} from 'firebase-functions/v1/https';
import config from './config';
import {CallableRequest} from 'firebase-functions/v2/https';

const checkAuth = (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
};

const checkAppCheck = (request: CallableRequest) => {
  if (request.app == undefined) {
    throw new HttpsError(
      'failed-precondition',
      'The function must be called from an App Check verified app.'
    );
  }
};

export function onAuthenticatedCall<TData, Return>(
  handler: (request: CallableRequest<TData>) => Return
): CallableFunction {
  return functions.https.onCall(
    {
      enforceAppCheck: config.enforceAppCheck,
      consumeAppCheckToken: config.enforceAppCheck,
    },
    async (request: CallableRequest<TData>) => {
      if (config.enforceAppCheck) {
        checkAppCheck(request);
      }
      checkAuth(request);
      return handler(request);
    }
  );
}

export const fetchFromApi = async (url: string, options?: RequestInit) => {
  let response: Response;

  const urlWithKey = `${url}?key=${config.apiKey}`;

  try {
    response = await fetch(urlWithKey, options);
  } catch (e) {
    if (e instanceof Error) {
      throw new HttpsError('internal', e.message);
    }
    throw new HttpsError('internal', 'Unknown error');
  }

  const data = await getDataFromResponse(response);

  if (!response.ok) {
    let message: string;
    let details: any;
    if (data.error) {
      message = data.error.message;

      if (data.error.details && data.error.details.length > 0) {
        details = {...data.error.details[0], httpErrorCode: response.status};
      } else if (data.error.details) {
        details = {...data.error.details, httpErrorCode: response.status};
      }
    } else {
      message = response.statusText ?? 'Unknown error, see details';
      details = {
        httpErrorCode: response.status,
      };
    }
    throw new HttpsError(
      codeToFunctionsErrorCode[response.status] || 'internal',
      message,
      details
    );
  }
  return data;
};

interface ExpectedBody {
  error?: {
    message: string;
    details?: any;
  };
  [key: string]: unknown;
}

const getDataFromResponse = async (
  response: Response
): Promise<ExpectedBody> => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return (await response.json()) as Record<string, unknown>;
  } else {
    const parsedResponse = JSON.parse(await response.text());
    return parsedResponse as Record<string, unknown>;
  }
};

export const codeToFunctionsErrorCode: Record<number, FunctionsErrorCode> = {
  400: 'invalid-argument',
  401: 'unauthenticated',
  403: 'permission-denied',
  404: 'not-found',
  409: 'already-exists',
  429: 'resource-exhausted',
  499: 'cancelled',
  500: 'internal',
  501: 'unimplemented',
  503: 'unavailable',
  504: 'deadline-exceeded',
};
