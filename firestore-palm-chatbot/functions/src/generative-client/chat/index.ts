import config from '../../config';
import {GeminiDiscussionClient} from './gemini';
import {PalmDiscussionClient} from './generative';
import {VertexDiscussionClient} from './vertex';
import {GoogleGenerativeAI} from '@google/generative-ai';
import {
  DiscussServiceClient,
  TextServiceClient,
} from '@google-ai/generativelanguage';
import {v1} from '@google-cloud/aiplatform';
import {DiscussionClient} from './base_class';

enum GenerativeAIProvider {
  PALM = 'palm',
  VERTEX = 'vertex',
  GEMINI = 'gemini',
}

type Client =
  | GoogleGenerativeAI
  | DiscussServiceClient
  | v1.PredictionServiceClient;

const {temperature, topP, topK, candidateCount, context} = config;

// const bot = new Discussion({
//   context,
//   model: model,
//   temperature,
//   topP,
//   topK,
//   candidateCount,
// });

const palmOptions = {
  context,
  temperature,
  topP,
  topK,
  candidateCount,
};

const getGenerativeClient = (
  provider: GenerativeAIProvider
  // TODO: fix any
): DiscussionClient<Client, any, any> => {
  switch (provider) {
    case GenerativeAIProvider.PALM:
      if (!config.palm.model) throw new Error('Palm model not set');
      return new PalmDiscussionClient({
        model: config.palm.model,
        apiKey: config.palm.apiKey,
        ...palmOptions,
      });
    case GenerativeAIProvider.VERTEX:
      if (!config.vertex.model) throw new Error('Vertex model not set');
      return new VertexDiscussionClient({
        model: config.vertex.model,
        projectId: config.projectId,
        location: config.location,
        ...palmOptions,
      });
    case GenerativeAIProvider.GEMINI:
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

export const discussionClient = getGenerativeClient(
  config.provider as GenerativeAIProvider
);
