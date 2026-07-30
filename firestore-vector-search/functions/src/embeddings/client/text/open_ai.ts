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

import OpenAI from 'openai';
import {EmbedClient} from '../base_class';
import {config} from '../../../config';

export class OpenAIEmbedClient extends EmbedClient {
  openaiClient: OpenAI | undefined;

  constructor() {
    // TODO: double check batch size
    super({batchSize: 16, dimension: 1536}); // Adjust the dimension based on the model you choose
  }

  async initialize() {
    await super.initialize();
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: config.openAIApiKey,
      });
      console.log('Initialized OpenAI Client');
    }
  }

  async getEmbeddings(batch: string[]): Promise<number[][]> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client is not initialized');
    }

    const embeddingRequest: OpenAI.Embeddings.EmbeddingCreateParams = {
      model: 'text-embedding-ada-002',
      input: batch,
    };

    try {
      const response =
        await this.openaiClient.embeddings.create(embeddingRequest);
      const embeddings = response.data.map(e => e.embedding);

      return embeddings;
    } catch (error) {
      console.error('Error fetching embeddings:', error);
      throw new Error('Error with embedding, see function logs for details');
    }
  }
}
