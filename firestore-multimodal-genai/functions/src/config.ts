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

import {GLSafetySetting, GLHarmCategory, GLHarmBlockThreshold} from './types';

export enum GenerativeAIProvider {
  GOOGLE_AI = 'google-ai',
  VERTEX_AI = 'vertex-ai',
}

export interface Config {
  vertex: {
    model: string;
  };
  googleAi: {
    model: string;
    apiKey?: string;
  };
  location: string;
  projectId: string;
  instanceId: string;
  prompt: string;
  responseField: string;
  collectionName: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  candidatesField?: string;
  maxOutputTokens?: number;
  variableFields?: string[];
  maxOutputTokensVertex?: number;
  provider?: string;
  apiKey?: string;
  generativeSafetySettings?: GLSafetySetting[];
  bucketName?: string;
  imageField: string;
  // ragConfig: {
  //   customRagHookUrl?: string;
  //   customRagHookApiKey?: string;
  //   ragHookInputFields?: string[];
  //   ragHookOutputFields?: string[];
  // };
}

function getModel() {
  switch (process.env.GENERATIVE_AI_PROVIDER) {
    case 'vertex-ai':
      switch (process.env.MODEL) {
        case 'gemini-pro':
          return 'gemini-pro';
        case 'gemini-pro-vision':
          return 'gemini-pro-vision';
        default:
          throw new Error('Invalid model');
      }
    case 'google-ai':
      switch (process.env.MODEL) {
        case 'gemini-pro':
          return 'gemini-pro';
        case 'gemini-pro-vision':
          return 'gemini-pro-vision';
        default:
          throw new Error('Invalid model');
      }
    default:
      throw new Error('Invalid provider');
  }
}

function getGenerativeSafetySettings() {
  const {
    UNSPECIFIED_THRESHOLD,
    DEROGATORY_THRESHOLD,
    TOXICITY_THRESHOLD,
    VIOLENCE_THRESHOLD,
    SEXUAL_THRESHOLD,
    MEDICAL_THRESHOLD,
    DANGEROUS_THRESHOLD,
  } = process.env as Record<string, keyof typeof GLHarmBlockThreshold>;

  // Array to map categories to their environmental variables
  return [
    {
      category: GLHarmCategory.HARM_CATEGORY_UNSPECIFIED,
      threshold: UNSPECIFIED_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_DEROGATORY,
      threshold: DEROGATORY_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_TOXICITY,
      threshold: TOXICITY_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_VIOLENCE,
      threshold: VIOLENCE_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_SEXUAL,
      threshold: SEXUAL_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_MEDICAL,
      threshold: MEDICAL_THRESHOLD!,
    },
    {
      category: GLHarmCategory.HARM_CATEGORY_DANGEROUS,
      threshold: DANGEROUS_THRESHOLD!,
    },
  ];
}

const defaultBucketName = `${process.env.PROJECT_ID}.appspot.com`;

export default {
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
  collectionName:
    process.env.COLLECTION_NAME ||
    'users/{uid}/discussions/{discussionId}/messages',
  prompt: process.env.PROMPT!,
  responseField: process.env.RESPONSE_FIELD || 'output',
  temperature: process.env.TEMPERATURE
    ? parseFloat(process.env.TEMPERATURE)
    : undefined,
  topP: process.env.TOP_P ? parseFloat(process.env.TOP_P) : undefined,
  topK: process.env.TOP_K ? parseInt(process.env.TOP_K) : undefined,
  candidateCount: process.env.CANDIDATE_COUNT
    ? parseInt(process.env.CANDIDATE_COUNT)
    : 1,
  candidatesField: process.env.CANDIDATES_FIELD || 'candidates',
  variableFields: process.env.VARIABLE_FIELDS
    ? process.env.VARIABLE_FIELDS.split(',')
    : undefined,
  provider: process.env.GENERATIVE_AI_PROVIDER,
  maxOutputTokensVertex: process.env.MAX_OUTPUT_TOKENS
    ? parseInt(process.env.MAX_OUTPUT_TOKENS)
    : 1024,
  apiKey: process.env.API_KEY,
  generativeSafetySettings: getGenerativeSafetySettings(),
  bucketName: process.env.BUCKET_NAME || defaultBucketName,
  imageField: process.env.IMAGE_FIELD || 'image',
  // ragConfig: {
  //   customRagHookUrl: process.env.CUSTOM_RAG_HOOK_URL,
  //   ragHookInputFields: process.env.RAG_HOOK_INPUT_FIELDS
  //     ? process.env.RAG_HOOK_INPUT_FIELDS.split(',')
  //     : undefined,
  //   ragHookOutputFields: process.env.RAG_HOOK_OUTPUT_FIELDS
  //     ? process.env.RAG_HOOK_OUTPUT_FIELDS.split(',')
  //     : undefined,
  //   // customRagHookApiKey: process.env.RAG_HOOK_API_KEY,
  // },
};
