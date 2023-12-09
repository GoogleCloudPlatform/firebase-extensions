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

import {GLHarmBlockThreshold, GLHarmCategory, GLSafetySetting} from './types';

export interface Config {
  palm: {
    model?: string;
    safetySettings?: GLSafetySetting[];
    apiKey?: string;
  };
  vertex: {
    model?: string;
  };
  gemini: {
    model?: string;
    apiKey?: string;
  };
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
  maxOutputTokens?: number;
  contentFilterThreshold?: string;
  generativeSafetySettings: GLSafetySetting[];
}

function getModel() {
  switch (process.env.GENERATIVE_AI_PROVIDER) {
    case 'generative':
      switch (process.env.MODEL) {
        default:
          return 'models/text-bison-001';
      }
    case 'vertex':
      switch (process.env.MODEL) {
        default:
          return 'text-bison@001';
      }
    case 'gemini':
      switch (process.env.MODEL) {
        case 'gemini-pro':
          return 'gemini-pro';
        case 'gemini-ultra':
          return 'gemini-ultra';
        default:
          throw new Error('Invalid model');
      }
    default:
      throw new Error('Invalid provider');
  }
}

function getGenerativeSafetySettings() {
  const {CONTENT_FILTER_THRESHOLD} = process.env as Record<
    string,
    keyof typeof GLHarmBlockThreshold
  >;

  // Array to map categories to their environmental variables
  return [
    {
      category: GLHarmCategory.HARM_CATEGORY_UNSPECIFIED,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_DEROGATORY,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_TOXICITY,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_VIOLENCE,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_SEXUAL,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_MEDICAL,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_DANGEROUS,
      threshold: CONTENT_FILTER_THRESHOLD!,
    },
  ];
}

const config: Config = {
  palm: {
    model: getModel(),
    safetySettings: getGenerativeSafetySettings(),
    apiKey: process.env.API_KEY,
  },
  vertex: {
    model: getModel(),
  },
  gemini: {
    model: getModel(),
    apiKey: process.env.API_KEY,
  },
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,
  collectionName:
    process.env.COLLECTION_NAME || 'summaries/{summaryId}/messages',
  textField: process.env.TEXT_FIELD || 'text',
  responseField: process.env.RESPONSE_FIELD || 'output',
  targetSummaryLength: process.env.TARGET_SUMMARY_LENGTH
    ? parseInt(process.env.TARGET_SUMMARY_LENGTH)
    : 3,
  provider: process.env.GENERATIVE_AI_PROVIDER || 'vertex',
  model: getModel(),
  apiKey: process.env.API_KEY,
  maxOutputTokens: process.env.MAX_OUTPUT_TOKENS
    ? parseInt(process.env.MAX_OUTPUT_TOKENS)
    : 1024,
  generativeSafetySettings: getGenerativeSafetySettings(),
};

export default config;
