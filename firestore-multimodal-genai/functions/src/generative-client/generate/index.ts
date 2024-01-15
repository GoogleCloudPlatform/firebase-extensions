import config, {GenerativeAIProvider} from '../../config';
import {GenerativeClient} from './base_text_client';
import {GenerativeLanguageClient} from './generative_language';
import {v1} from '@google-ai/generativelanguage';
import {VertexLanguageClient} from './vertex_ai';
import {VertexAI} from '@google-cloud/vertexai';
import {GeminiGenerativeClient} from './generative_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';

type Client = v1.GenerativeServiceClient | VertexAI | GoogleGenerativeAI;

export const getGenerativeClient = (): GenerativeClient<any, Client> => {
  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      console.log('using google ai');
      if (!config.googleAi.model) throw new Error('Gemini model not set');

      if (!config.googleAi.apiKey) throw new Error('Gemini api key not set');

      return new GeminiGenerativeClient({
        apiKey: config.googleAi.apiKey,
        modelName: config.googleAi.model,
      });

      return new GenerativeLanguageClient({
        apiKey: config.googleAi.apiKey,
        modelName: `models/${config.googleAi.model}`,
      });
    case 'vertex-ai':
      return new VertexLanguageClient({
        modelName: config.vertex.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
