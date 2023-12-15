import config, {GenerativeAIProvider} from '../../config';
import {GenerativeClient} from './base_text_client';
import {GeminiGenerativeClient} from './google_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';

type Client = GoogleGenerativeAI;

export const getGenerativeClient = (): GenerativeClient<any, Client> => {
  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.apiKey) throw new Error('Gemini API Key not set');
      if (!config.googleAi.model) throw new Error('Gemini model not set');

      return new GeminiGenerativeClient({
        apiKey: config.googleAi.apiKey,
        modelName: config.googleAi.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
