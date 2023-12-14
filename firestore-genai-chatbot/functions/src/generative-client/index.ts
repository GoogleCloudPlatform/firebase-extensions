import config, {GenerativeAIProvider} from '../config';
import {GeminiDiscussionClient} from './google_ai';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {DiscussionClient} from './base_class';
import {VertexAIGeminiDiscussionClient} from './vertex_ai';

type Client = GoogleGenerativeAI;

// TODO fix any
export const getGenerativeClient = (): DiscussionClient<Client, any, any> => {
  switch (config.provider as GenerativeAIProvider) {
    case GenerativeAIProvider.VERTEX_AI:
      if (!config.gemini.apiKey) throw new Error('Gemini API Key not set');
      if (!config.gemini.model) throw new Error('Gemini model not set');
      return new VertexAIGeminiDiscussionClient({
        apiKey: config.gemini.apiKey,
        modelName: config.gemini.model,
      });
    case GenerativeAIProvider.GOOGLE_AI:
      if (!config.gemini.apiKey) throw new Error('Gemini API Key not set');
      if (!config.gemini.model) throw new Error('Gemini model not set');
      return new GeminiDiscussionClient({
        apiKey: config.gemini.apiKey,
        modelName: config.gemini.model,
      });
    default:
      throw new Error('Invalid provider');
  }
};
