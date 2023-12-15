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

export enum GenerativeAIProvider {
  GOOGLE_AI = 'google-ai',
  VERTEX_AI = 'vertex-ai',
}

export interface Config {
  vertex: {
    model?: string;
  };
  googleAi: {
    model?: string;
    apiKey?: string;
  };
  location: string;
  projectId: string;
  instanceId: string;
  promptField: string;
  responseField: string;
  orderField: string;
  enableDiscussionOptionOverrides: boolean;
  collectionName: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  candidatesField?: string;
  provider: GenerativeAIProvider;
  apiKey?: string;
}

function getModel() {
  switch (process.env.GENERATIVE_AI_PROVIDER as GenerativeAIProvider) {
    case 'vertex-ai':
      switch (process.env.MODEL) {
        case 'gemini-pro':
          return 'gemini-pro';
        default:
          throw new Error('Invalid model');
      }
    case 'google-ai':
      switch (process.env.MODEL) {
        case 'gemini-pro':
          return 'gemini-pro';
        default:
          throw new Error('Invalid model');
      }
    default:
      throw new Error('Invalid provider');
  }
}

const config: Config = {
  vertex: {
    model: getModel(),
  },
  googleAi: {
    model: getModel(),
    apiKey: process.env.API_KEY,
  },
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,
  // user defined
  collectionName:
    process.env.COLLECTION_NAME ||
    'users/{uid}/discussions/{discussionId}/messages',
  promptField: process.env.PROMPT_FIELD || 'prompt',
  responseField: process.env.RESPONSE_FIELD || 'response',
  orderField: process.env.ORDER_FIELD || 'createTime',
  enableDiscussionOptionOverrides:
    process.env.ENABLE_DISCUSSION_OPTION_OVERRIDES === 'yes',
  temperature: process.env.TEMPERATURE
    ? parseFloat(process.env.TEMPERATURE)
    : undefined,
  topP: process.env.TOP_P ? parseFloat(process.env.TOP_P) : undefined,
  topK: process.env.TOP_K ? parseInt(process.env.TOP_K) : undefined,
  candidateCount: process.env.CANDIDATE_COUNT
    ? parseInt(process.env.CANDIDATE_COUNT)
    : 1,
  candidatesField: process.env.CANDIDATES_FIELD || 'candidates',
  provider:
    (process.env.GENERATIVE_AI_PROVIDER as GenerativeAIProvider) ||
    GenerativeAIProvider.GOOGLE_AI,
  apiKey: process.env.API_KEY,
};

export default config;
