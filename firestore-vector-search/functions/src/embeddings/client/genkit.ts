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

import {EmbedderReference, Genkit, genkit} from 'genkit';
import {config} from '../../config';
import {GenkitPluginV2} from 'genkit/plugin';
import {googleAI, vertexAI} from '@genkit-ai/google-genai';
import {GEMINI_EMBEDDING_MODEL} from './models';

export class GenkitEmbedClient {
  provider: 'vertexai' | 'googleai' | 'multimodal';
  client: Genkit;
  embedder: EmbedderReference;
  batchSize: number;
  dimension: number;

  constructor({
    provider,
  }: {
    batchSize: number;
    dimension: number;
    provider: 'vertexai' | 'googleai';
  }) {
    this.provider = provider;

    let plugins: GenkitPluginV2[] = [];

    if (this.provider === 'vertexai') {
      this.embedder = vertexAI.embedder(GEMINI_EMBEDDING_MODEL, {
        outputDimensionality: 768,
      });
      plugins = [
        vertexAI({
          location: config.location,
        }),
      ];
    }
    if (this.provider === 'googleai') {
      this.embedder = googleAI.embedder(GEMINI_EMBEDDING_MODEL, {
        outputDimensionality: 768,
      });
      plugins = [
        googleAI({
          apiKey: config.geminiApiKey,
        }),
      ];
    }
    this.client = genkit({
      plugins,
    });
  }

  async initialize() {
    // optional to implement this as it might not be needed.
  }

  async getEmbeddings(inputs: string[]): Promise<number[][]> {
    const embeddingResults = await this.client.embedMany({
      embedder: this.embedder,
      content: inputs,
    });
    return embeddingResults.map(result => result.embedding);
  }

  async getSingleEmbedding(input: string): Promise<number[]> {
    const embeddingResults = await this.client.embed({
      embedder: this.embedder,
      content: input,
    });
    return embeddingResults[0].embedding;
  }
}
