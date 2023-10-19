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

export interface Config {
  location: string;
  projectId: string;
  instanceId: string;
  model: string;
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

const config: Config = {
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,
  collectionName:
    process.env.COLLECTION_NAME ||
    'users/{uid}/discussions/{discussionId}/messages',
  model: getModel(),
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
  provider: process.env.PALM_API_PROVIDER,
  maxOutputTokensVertex: process.env.MAX_OUTPUT_TOKENS
    ? parseInt(process.env.MAX_OUTPUT_TOKENS)
    : 100,
  apiKey: process.env.API_KEY,
  generativeSafetySettings: getGenerativeSafetySettings(),
};

export default config;
