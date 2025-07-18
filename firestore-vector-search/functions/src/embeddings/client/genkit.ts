import {EmbedderReference, Genkit, genkit} from 'genkit';
import {config} from '../../config';
import {GenkitPlugin} from 'genkit/plugin';
import {
  googleAI,
  textEmbedding004 as textEmbedding004Google,
} from '@genkit-ai/googleai';
import {
  textEmbedding004 as textEmbedding004Vertex,
  vertexAI,
} from '@genkit-ai/vertexai';

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

    let plugins: GenkitPlugin[] = [];

    if (this.provider === 'vertexai') {
      this.embedder = textEmbedding004Vertex;
      plugins = [
        vertexAI({
          location: config.location,
        }),
      ];
    }
    if (this.provider === 'googleai') {
      this.embedder = textEmbedding004Google;
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
