import config, {GenerativeAIProvider} from '../config';
import {DiscussionClient} from './base_class';
import {v1} from '@google-ai/generativelanguage';
import {GenerativeLanguageDiscussionClient} from './generative_language';

type Client = v1.GenerativeServiceClient;

// TODO fix any
export const getGenerativeClient = (): DiscussionClient<Client, any, any> => {
  switch (config.provider as GenerativeAIProvider) {
    case 'google-ai':
      if (!config.googleAi.model) throw new Error('Gemini model not set');
      return new GenerativeLanguageDiscussionClient({
        apiKey: config.googleAi.apiKey,
        modelName: `models/${config.googleAi.model}`,
      });
    default:
      throw new Error('Invalid provider');
  }
};
