import config, {GenerativeAIProvider} from '../../config';
import {GenerativeClient} from './base_text_client';
import {GenerativeLanguageClient} from './generative_language';
import {v1} from '@google-ai/generativelanguage';

type Client = v1.GenerativeServiceClient;

export const getGenerativeClient = (): GenerativeClient<any, Client> => {
  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.model) throw new Error('Gemini model not set');

      return new GenerativeLanguageClient({
        apiKey: config.googleAi.apiKey,
        modelName: `models/${config.googleAi.model}`,
      });
    default:
      throw new Error('Invalid provider');
  }
};
