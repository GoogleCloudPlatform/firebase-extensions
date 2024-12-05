import {config, EmbeddingProvider} from '../../config';
import {MultimodalEmbeddingClient} from './multimodal';
import {CustomEndpointClient} from './text/custom_function';
import {GeminiAITextEmbedClient} from './text/gemini';
import {OpenAIEmbedClient} from './text/open_ai';
import {VertexAITextEmbedClient} from './text/vertex_ai';
import {GenkitEmbedClient} from './genkit';
const getEmbeddingClient = () => {
  // Use Genkit where possible.
  if (
    //  Note genkit is yet to suppport multimodal embeddings
    (config.embeddingProvider as string) === 'gemini' ||
    (config.embeddingProvider as string) === 'vertex'
  ) {
    const provider =
      config.embeddingProvider === 'vertex' ? 'vertexai' : 'googleai';

    return new GenkitEmbedClient({
      batchSize: 1,
      dimension: 768,
      provider,
    });
  }

  switch (config.embeddingProvider) {
    case 'gemini' as EmbeddingProvider.Gemini:
      return new GeminiAITextEmbedClient();
    case 'multimodal' as EmbeddingProvider.Multimodal:
      return new MultimodalEmbeddingClient({
        batchSize: 1,
        dimension: 1408,
      });
    case 'openai' as EmbeddingProvider.OpenAI:
      return new OpenAIEmbedClient();
    case 'vertex' as EmbeddingProvider.VertexAI:
      return new VertexAITextEmbedClient();
    case 'custom' as EmbeddingProvider.Custom:
      return new CustomEndpointClient();
    default:
      throw new Error('Provider option not implemented');
  }
};

export const embeddingClient = getEmbeddingClient();
