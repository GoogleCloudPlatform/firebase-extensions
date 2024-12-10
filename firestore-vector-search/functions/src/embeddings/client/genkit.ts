import {EmbedderReference, Genkit, genkit} from 'genkit';
import {config} from '../../config';
import {GenkitPlugin} from 'genkit/plugin';
import {
  googleAI,
  textEmbeddingGecko001 as textEmbeddingGecko001GoogleAI,
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
      this.embedder = textEmbeddingGecko001GoogleAI;
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

  async getEmbeddings(_inputs: string[]): Promise<number[][]> {
    const embeddings = await this.client.embedMany({
      embedder: textEmbedding004Vertex,
      content: _inputs,
    });
    return embeddings.map(result => result.embedding);
  }

  async getSingleEmbedding(input: string): Promise<number[]> {
    const embedding = this.client.embed({
      embedder: this.embedder,
      content: input,
    });
    return embedding;
  }
}
