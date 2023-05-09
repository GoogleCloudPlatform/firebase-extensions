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
import {logger} from 'firebase-functions';
import {Config} from './config';

export const APIKeyNeeded = () => {
  logger.error(
    '[palm-secure-backend] API key is not set. An API key with sufficient permissions is required to use this extension. See preinstall information.'
  );
};

export const hideApiKey = (config: Config) => {
  return config.apiKey
    ? {
        ...config,
        apiKey: '********',
      }
    : config;
};

export const init = (config: Config) => {
  logger.info(
    `[palm-secure-backend] Initialized with config: ${JSON.stringify(
      hideApiKey(config)
    )}`
  );
};

export const receivedAPIResponse = (path: string, duration: number) => {
  logger.info(
    `[palm-secure-backend] Received API response for document '${path}' in ${duration}ms.`,
    {duration}
  );
};

export const errorCallingGLMAPI = (path: string, error: any) => {
  logger.error(
    `[palm-secure-backend]  Error calling PaLM API for document '${path}': ${
      error.message || 'UNKNOWN ERROR'
    }`
  );
};

export const functionStarted = (url: string) => {
  logger.info(`[palm-secure-backend] Function started for URL '${url}'`);
};
export const functionCompleted = (url: string, duration: number) => {
  logger.info(
    `[palm-secure-backend] Function completed. Called PaLM '${url}' in ${duration}ms.`,
    {duration}
  );
};
