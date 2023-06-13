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
import {
  callCustomHookIfEnabled,
  fetchFromApi,
  onAuthenticatedCall,
} from './util';
import {
  recordOnErrorEvent,
  recordOnRequestEvent,
  recordOnStartEvent,
  recordOnResponseEvent,
} from './events';

logs.init(config);

const {palmEndpoint, apiVersion} = config;

export const getModels = onAuthenticatedCall<void, any>(
  async (data, context) => {
    recordOnStartEvent('getModels', data, context);

    const url = `https://${palmEndpoint}/${apiVersion}/models`;
    // get uid from context
    const uid = context.auth!.uid;

    try {
      recordOnRequestEvent('getModels', {url}, context);

      const response = await fetchFromApi(url);
      recordOnResponseEvent('getModels', {fetchArgs: {url}, response}, context);
      callCustomHookIfEnabled({url}, response, uid);

      return response;
    } catch (error) {
      recordOnErrorEvent('getModels', error, context);
      callCustomHookIfEnabled({url}, error, uid);
      throw error;
    }
  }
);

export const getModel = onAuthenticatedCall<{name: string}, any>(
  async (data, context) => {
    recordOnStartEvent('getModel', data, context);

    const url = `https://${palmEndpoint}/${apiVersion}/models/${data.name}`;

    // get uid from context
    const uid = context.auth!.uid;

    try {
      recordOnRequestEvent('getModel', {url}, context);
      const response = await fetchFromApi(url);

      recordOnResponseEvent('getModel', {fetchArgs: {url}, response}, context);
      callCustomHookIfEnabled({url}, response, uid);

      return response;
    } catch (error) {
      recordOnErrorEvent('getModel', error, context);
      callCustomHookIfEnabled({url}, error, uid);
      throw error;
    }
  }
);

export const post = onAuthenticatedCall<any, any>(async (data, context) => {
  recordOnStartEvent('post', data, context);

  const {model, method} = data;
  const uid = context.auth!.uid;

  if (!model) {
    const error = new HttpsError('invalid-argument', 'Model name is required');
    recordOnErrorEvent('post', error, context);
    callCustomHookIfEnabled({}, error, uid);
    throw error;
  }

  delete data.model;

  if (!method) {
    const error = new HttpsError('invalid-argument', 'Method name is required');
    recordOnErrorEvent('post', error, context);
    callCustomHookIfEnabled({}, error, uid);
    throw error;
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

  try {
    recordOnRequestEvent('post', {url, options}, context);
    const response = await fetchFromApi(url, options);
    callCustomHookIfEnabled({url, options}, response, uid);
    recordOnResponseEvent(
      'post',
      {fetchArgs: {url, options}, response},
      context
    );

    return response;
  } catch (error) {
    recordOnErrorEvent('post', error, context);
    callCustomHookIfEnabled({url, options}, error, uid);
    throw error;
  }
});
