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

export interface Config {
  location: string;
  projectId: string;
  instanceId: string;
  collectionName: string;
  textField: string;
  responseField: string;
  targetSummaryLength?: number;
  provider: string;
  model: string;
  apiKey?: string;
}

function getModel() {
  switch (process.env.PALM_API_PROVIDER) {
    case 'generative':
      switch (process.env.MODEL) {
        default:
          return 'text-bison-001';
      }
    default:
      switch (process.env.MODEL) {
        default:
          return 'text-bison@001';
      }
  }
}

const config: Config = {
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,
  collectionName:
    process.env.COLLECTION_NAME || 'summaries/{summaryId}/messages',
  textField: process.env.TEXT_FIELD || 'text',
  responseField: process.env.RESPONSE_FIELD || 'output',
  targetSummaryLength: process.env.TARGET_SUMMARY_LENGTH
    ? parseInt(process.env.TARGET_SUMMARY_LENGTH)
    : undefined,
  provider: process.env.PALM_API_PROVIDER || 'vertex',
  model: getModel(),
  apiKey: process.env.API_KEY,
};

export default config;
