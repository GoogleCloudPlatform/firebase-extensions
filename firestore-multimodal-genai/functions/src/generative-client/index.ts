import config, {GenerativeAIProvider} from '../config';
import {GenerativeClient} from './base_client';
import {VertexLanguageClient} from './vertex_ai';
import {VertexAI} from '@google-cloud/vertexai';
import {GeminiGenerativeClient} from './generative_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {GenkitGenerativeClient} from './genkit';
import {type Genkit} from 'genkit';

type Client = Genkit | VertexAI | GoogleGenerativeAI;

export const getGenerativeClient = (): GenerativeClient<any, Client> => {
  if (GenkitGenerativeClient.shouldUseGenkitClient(config)) {
    return new GenkitGenerativeClient(config);
  }

  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.model) throw new Error('Gemini model not set');

      if (!config.googleAi.apiKey) throw new Error('Gemini API key not set');

      return new GeminiGenerativeClient({
        apiKey: config.googleAi.apiKey,
        modelName: config.googleAi.model,
      });
    case 'vertex-ai':
      if (!config.vertex.model) throw new Error('Gemini model not set');

      return new VertexLanguageClient({
        modelName: config.vertex.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};

export {GenerativeResponse} from './base_client';
