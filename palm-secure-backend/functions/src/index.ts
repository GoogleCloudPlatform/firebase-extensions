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

import config from './config';
import * as logs from './logs';
import {HttpsError} from 'firebase-functions/v1/https';
import {fetchFromApi, onAuthenticatedCall} from './util';

logs.init(config);

const {palmEndpoint, apiVersion} = config;

export const getModels = onAuthenticatedCall<void, any>(async () => {
  const url = `https://${palmEndpoint}/${apiVersion}/models`;
  const response = await fetchFromApi(url);
  return response;
});

export const getModel = onAuthenticatedCall<{name: string}, any>(
  async request => {
    if (!request.data.name) {
      throw new HttpsError('invalid-argument', 'Model name is required');
    }
    const url = `https://${palmEndpoint}/${apiVersion}/models/${request.data.name}`;
    const response = await fetchFromApi(url);
    return response;
  }
);

export const post = onAuthenticatedCall<{model?: string; method?: string}, any>(
  async request => {
    const data = request.data;

    const {model, method} = data;

    if (!model) {
      throw new HttpsError('invalid-argument', 'Model name is required');
    }

    delete data.model;

    if (!method) {
      throw new HttpsError('invalid-argument', 'Method name is required.');
    }

    delete data.method;

    const url = `https://${palmEndpoint}/${apiVersion}/models/${model}:${method}`;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    return fetchFromApi(url, options);
  }
);
