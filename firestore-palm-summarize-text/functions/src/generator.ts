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

import {TextServiceClient} from '@google-ai/generativelanguage';
import * as logs from './logs';
import {GoogleAuth} from 'google-auth-library';
import {APIGenerateTextRequest} from './types';

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
export type TextGeneratorResponse = {candidates: string[]};

export class TextGenerator {
  private client: TextServiceClient;
  instruction?: string;
  context?: string;
  model = 'models/text-bison-001';
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
    logs.usingADC();
    const auth = new GoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/generative-language',
      ],
    });
    this.client = new TextServiceClient({
      auth,
    });
  }

  async generate(
    prompt: string,
    options: TextGeneratorRequestOptions = {}
  ): Promise<TextGeneratorResponse> {
    // remove the colon from the end of instruction if it exists

    const request = {
      prompt: {
        text: prompt,
      },
      model: this.model,
      ...options,
    };

    const [result] = await this.client.generateText(request);

    if (!result.candidates || !result.candidates.length) {
      throw new Error('No candidates returned from server.');
    }

    //TODO: do we need to filter out empty strings? This seems to be a type issue with the API, why are they optional?
    const candidates = result.candidates
      .map(candidate => candidate.output)
      .filter(output => !!output) as string[];

    if (!candidates.length) {
      throw new Error('No candidates returned from server.');
    }

    return {
      candidates,
    };
  }
}
