import config, {GenerativeAIProvider} from '../config';
import {GeminiDiscussionClient} from './google_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {DiscussionClient} from './base_class';

type Client = GoogleGenerativeAI;

// TODO fix any
export const getGenerativeClient = (): DiscussionClient<Client, any, any> => {
  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.apiKey) throw new Error('Gemini API Key not set');
      if (!config.googleAi.model) throw new Error('Gemini model not set');
      return new GeminiDiscussionClient({
        apiKey: config.googleAi.apiKey,
        modelName: config.googleAi.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
