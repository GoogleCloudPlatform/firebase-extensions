import config from '../../config';
import {GenerativeClient} from './base_text_client';
import {GeminiGenerativeClient} from './gemini';
import {PalmGenerativeClient} from './generative';
import {VertexGenerativeClient} from './vertex';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {TextServiceClient} from '@google-ai/generativelanguage';
import {v1} from '@google-cloud/aiplatform';

enum GenerativeAIProvider {
  PALM = 'palm',
  VERTEX = 'vertex',
  GEMINI = 'gemini',
}

type Client =
  | GoogleGenerativeAI
  | TextServiceClient
  | v1.PredictionServiceClient;

const getGenerativeClient = (
  provider: GenerativeAIProvider
  // TODO: types
): GenerativeClient<any, Client> => {
  switch (provider) {
    case GenerativeAIProvider.PALM:
      if (!config.palm.model) throw new Error('Palm model not set');
      return new PalmGenerativeClient({
        model: config.palm.model,
        safetySettings: config.palm.safetySettings,
        apiKey: config.palm.apiKey,
      });
    case GenerativeAIProvider.VERTEX:
      if (!config.vertex.model) throw new Error('Vertex model not set');
      return new VertexGenerativeClient({
        model: config.vertex.model,
        projectId: config.projectId,
        location: config.location,
      });
    case GenerativeAIProvider.GEMINI:
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

export const generativeClient = getGenerativeClient(
  config.provider as GenerativeAIProvider
);
