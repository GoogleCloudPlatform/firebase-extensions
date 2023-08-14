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

import {TextServiceClient} from '@google-ai/generativelanguage';
import {helpers, v1} from '@google-cloud/aiplatform';

import * as logs from './logs';
import {GoogleAuth} from 'google-auth-library';
import {
  APIGenerateTextRequest,
  VertexPredictResponse,
  APIGenerateTextResponse,
} from './types';
import config from './config';

export interface TextGeneratorOptions {
  model?: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  instruction?: string;
}

export type TextGeneratorRequestOptions = Omit<
  APIGenerateTextRequest,
  'prompt' | 'model'
>;

export class TextGenerator {
  private generativeClient?: TextServiceClient;
  private vertexClient?: v1.PredictionServiceClient;
  private endpoint: string;
  instruction?: string;
  context?: string;
  model = config.model;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;

  constructor(options: TextGeneratorOptions = {}) {
    this.temperature = options.temperature;
    this.topP = options.topP;
    this.topK = options.topK;
    this.maxOutputTokens = options.maxOutputTokens;
    this.candidateCount = options.candidateCount;
    this.instruction = options.instruction;
    if (options.model) this.model = options.model;

    this.endpoint = `projects/${config.projectId}/locations/${config.location}/publishers/google/models/${this.model}`;

    if (config.provider === 'vertex') {
      this.initVertexClient();
    } else {
      this.initGenerativeClient();
    }
  }

  private initVertexClient() {
    const clientOptions = {
      apiEndpoint: `${config.location}-prediction-aiplatform.googleapis.com`,
    };

    this.vertexClient = new v1.PredictionServiceClient(clientOptions);
  }

  private initGenerativeClient() {
    logs.usingADC();

    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/generative-language',
      ],
    });
    this.generativeClient = new TextServiceClient({
      auth,
    });
  }

  async generate(
    promptText: string,
    options: TextGeneratorRequestOptions = {}
  ): Promise<TextGeneratorResponse> {
    if (config.provider === 'vertex') {
      if (!this.vertexClient) {
        throw new Error('Vertex client not initialized.');
      }
      const request = this.createVertexRequest(promptText, options);
      const [result] = await this.vertexClient.predict(request);

      return this.extractVertexCandidateResponse(result);
    }

    if (!this.generativeClient) {
      throw new Error('Generative client not initialized.');
    }

    const request = this.createGenerativeRequest(promptText, options);

    const [result] = await this.generativeClient.generateText(request);

    return this.extractGenerativeCandidationResponse(result);
  }

  private createGenerativeRequest(
    promptText: string,
    options: TextGeneratorRequestOptions = {}
  ) {
    const request = {
      prompt: {
        text: promptText,
      },
      model: `models/${this.model}`,
      topP: this.topP,
      topK: this.topK,
      temperature: this.temperature,
      candidateCount: this.candidateCount,
      maxOutputTokens: this.maxOutputTokens,
      ...options,
    };
    return request;
  }

  private extractGenerativeCandidationResponse(
    result: APIGenerateTextResponse
  ) {
    return convertToTextGeneratorResponse(result as GenerativePrediction);
  }

  private createVertexRequest(
    promptText: string,
    options: TextGeneratorRequestOptions = {}
  ) {
    const prompt = {
      prompt: promptText,
    };
    const instanceValue = helpers.toValue(prompt);
    const instances = [instanceValue!];

    const temperature = options.temperature || this.temperature;
    const topP = options.topP || this.topP;
    const topK = options.topK || this.topK;

    const parameter: Record<string, string | number> = {};
    // We have to set these conditionally or they get nullified and the request fails with a serialization error.
    if (temperature) {
      parameter.temperature = temperature;
    }
    if (topP) {
      parameter.top_p = topP;
    }
    if (topK) {
      parameter.top_k = topK;
    }
    if (config.maxOutputTokensVertex) {
      parameter.maxOutputTokens = config.maxOutputTokensVertex;
    }

    const parameters = helpers.toValue(parameter);

    const request = {
      endpoint: this.endpoint,
      instances,
      parameters,
    };
    return request;
  }

  private extractVertexCandidateResponse(result: VertexPredictResponse) {
    if (!result.predictions || !result.predictions.length) {
      throw new Error('No predictions returned from Vertex AI.');
    }

    const predictionValue = result.predictions[0] as protobuf.common.IValue;

    const vertexPrediction = helpers.fromValue(predictionValue);

    return convertToTextGeneratorResponse(vertexPrediction as VertexPrediction);
  }
}

type VertexPrediction = {
  safetyAttributes?: {
    blocked: boolean;
    categories: string[];
    scores: number[];
  };
  content?: string;
};

type GenerativePrediction = {
  candidates: {output: string}[];
  filters?: {reason: string}[];
  safetyFeedback?: {
    rating: Record<string, any>;
    setting: Record<string, any>;
  }[];
};

type TextGeneratorResponse = {
  candidates: string[];
  safetyMetadata?: {
    blocked: boolean;
    [key: string]: any;
  };
};

function convertToTextGeneratorResponse(
  prediction: VertexPrediction | GenerativePrediction
): TextGeneratorResponse {
  // if it's generative language
  if ('candidates' in prediction) {
    console.log('PRED', prediction);
    const {candidates, filters, safetyFeedback} = prediction;
    const blocked = !!filters && filters.length > 0;
    const safetyMetadata = {
      blocked,
      safetyFeedback,
    };
    if (!candidates.length && !blocked) {
      throw new Error('No candidates returned from the Generative API.');
    }
    return {
      candidates: candidates.map(candidate => candidate.output),
      safetyMetadata,
    };
  } else {
    // provider will be vertex
    const {content, safetyAttributes} = prediction;
    const blocked = !!safetyAttributes && !!safetyAttributes.blocked;
    const safetyMetadata = {
      blocked,
      safetyAttributes,
    };
    if (!content && !blocked) {
      throw new Error('No content returned from the Vertex PaLM API.');
    }
    return {
      candidates: blocked ? [] : [content!],
      safetyMetadata,
    };
  }
}
