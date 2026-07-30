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

import config, {GenerativeAIProvider} from '../config';
import {DiscussionClient} from './base_class';
import {GeminiDiscussionClient} from './google_ai';
import {VertexDiscussionClient} from './vertex_ai';
import {VertexAI} from '@google-cloud/vertexai';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {type Genkit} from 'genkit';
import {GenkitDiscussionClient} from './genkit';
type Client = Genkit | VertexAI | GoogleGenerativeAI;

// TODO fix any
export const getGenerativeClient = (): DiscussionClient<Client, any, any> => {
  // If using genkit is possible, we should:
  if (GenkitDiscussionClient.shouldUseGenkitClient(config)) {
    return new GenkitDiscussionClient(config);
  }

  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.model) throw new Error('Gemini model not set');

      return new GeminiDiscussionClient({
        apiKey: config.googleAi.apiKey,
        modelName: config.googleAi.model,
      });
    case 'vertex-ai':
      return new VertexDiscussionClient({
        modelName: config.vertex.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
