/**
 * Copyright 2026 Google LLC
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

import {GoogleGenerativeAI, Part} from '@google/generative-ai';
import {GenerativeClient} from './base_client';
import {logger} from 'firebase-functions/v1';
import {getImageBase64} from './image_utils';
import config from '../config';
enum Role {
  USER = 'user',
  GEMINI = 'model',
}

export class GeminiGenerativeClient extends GenerativeClient<
  any,
  GoogleGenerativeAI
> {
  apiKey: string;
  modelName: string;

  constructor({apiKey, modelName}: {apiKey: string; modelName: string}) {
    super();
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(this.apiKey);
    this.modelName = modelName;
  }

  async generate(promptText: string, options: any): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini Client not initialized.');
    }

    const model = this.client.getGenerativeModel({
      model: this.modelName,
    });
    const textPart: Part = {
      text: promptText,
    };
    const promptParts: Part[] = [textPart];

    if (config.imageField) {
      if (!options.image) {
        throw new Error('Vision model selected, but missing Image Field');
      }

      const base64String = await getImageBase64(options.image, 'google-ai');

      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: base64String,
        },
      };

      promptParts.push(imagePart);
    }
    let result;
    try {
      result = await model.generateContent({
        contents: [
          {
            role: Role.USER,
            parts: promptParts,
          },
        ],
        generationConfig: {
          topK: options.topK,
          topP: options.topP,
          temperature: options.temperature,
          candidateCount: options.candidateCount,
          maxOutputTokens: options.maxOutputTokens,
        },
        safetySettings: options.safetySettings,
      });
    } catch (e) {
      logger.error(e);
      // TODO: the error message provided exposes the API key, so we should handle this/ get the Gemini team to fix it their side.
      throw new Error(
        'failed to generate content, see function logs for details'
      );
    }

    const candidates =
      result.response.candidates?.map(c => c.content.parts[0].text) || [];

    if (!candidates || candidates.length === 0) {
      // TODO: handle blocked responses
      throw new Error('No candidates returned');
    }
    const firstCandidate = candidates[0];

    return {
      response: firstCandidate!,
      candidates: candidates,
      // TODO: add this as a feature:
      // safetyMetadata: promptFeedback,
    };
  }
}
