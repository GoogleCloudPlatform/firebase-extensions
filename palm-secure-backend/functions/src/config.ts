/**
 * Copyright 2023 Google LLC
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

export interface Config {
  apiKey: string;
  palmEndpoint: string;
  apiVersion: string;
  enforceAppCheck: boolean;
  customHookUrl?: string;
}

if (!process.env.API_KEY) {
  throw new Error(
    'Cannot find API key. Please set the API_KEY environment variable.'
  );
}

const config: Config = {
  apiKey: process.env.API_KEY,
  palmEndpoint: 'generativelanguage.googleapis.com',
  apiVersion: 'v1beta2',
  enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'yes',
  customHookUrl: process.env.CUSTOM_HOOK_URL,
};

export default config;
