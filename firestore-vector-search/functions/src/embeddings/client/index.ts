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

import {config, EmbeddingProvider} from '../../config';
import {MultimodalEmbeddingClient} from './multimodal';
import {CustomEndpointClient} from './text/custom_function';
import {OpenAIEmbedClient} from './text/open_ai';
import {GenkitEmbedClient} from './genkit';
const getEmbeddingClient = () => {
  // Use Genkit where possible.
  switch (config.embeddingProvider) {
    case 'gemini' as EmbeddingProvider.Gemini:
    case 'vertex' as EmbeddingProvider.VertexAI: {
      // Note genkit is yet to support multimodal embeddings
      const provider =
        config.embeddingProvider === 'vertex' ? 'vertexai' : 'googleai';
      return new GenkitEmbedClient({
        batchSize: 1,
        dimension: 768,
        provider,
      });
    }
    case 'multimodal' as EmbeddingProvider.Multimodal:
      return new MultimodalEmbeddingClient({
        batchSize: 1,
        dimension: 1408,
      });
    case 'openai' as EmbeddingProvider.OpenAI:
      return new OpenAIEmbedClient();
    case 'custom' as EmbeddingProvider.Custom:
      return new CustomEndpointClient();
    default:
      throw new Error('Provider option not implemented');
  }
};

export const embeddingClient = getEmbeddingClient();
