import config, {GenerativeAIProvider} from '../../config';
import {GenerativeClient} from './base_text_client';
import {GeminiGenerativeClient} from './google_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';

type Client = GoogleGenerativeAI;

export const getGenerativeClient = (): GenerativeClient<any, Client> => {
  switch (config.provider as GenerativeAIProvider) {
    case GenerativeAIProvider.VERTEX_AI:
      if (!config.gemini.apiKey) throw new Error('Gemini API Key not set');
      if (!config.gemini.model) throw new Error('Gemini model not set');
      return new GeminiGenerativeClient({
        apiKey: config.gemini.apiKey,
        modelName: config.gemini.model,
      });
    case GenerativeAIProvider.GOOGLE_AI:
      if (!config.gemini.apiKey) throw new Error('Gemini API Key not set');
      if (!config.gemini.model) throw new Error('Gemini model not set');
      return new GeminiGenerativeClient({
        apiKey: config.gemini.apiKey,
        modelName: config.gemini.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
