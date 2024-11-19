import {logger} from 'firebase-functions/v1';
import {logger as genkitLogger} from 'genkit/logging';
import {Part, MessageData, Genkit, genkit} from 'genkit';
import {DiscussionClient} from './base_class';
import {Message} from '../types';
import vertexAI from '@genkit-ai/vertexai';
import config from '../config';

interface GeminiChatOptions {
  history?: Message[];
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  projectId: string;
  location: string;
  context?: string;
}

const ai = genkit({
  plugins: [vertexAI()],
});

genkitLogger.setLogLevel('debug');

export class VertexDiscussionClient extends DiscussionClient<
  Genkit,
  GeminiChatOptions
> {
  modelName: string;

  constructor({modelName}: {apiKey?: string; modelName: string}) {
    super(ai);
    if (!modelName) {
      throw new Error('Model name required.');
    }
    this.modelName = modelName;
  }

  async generateResponse(
    history: MessageData[],
    latestApiMessage: Part[],
    options: GeminiChatOptions
  ) {
    try {
      // @ts-expect-error - passing in the model as a string means no config schema available in types
      const llmResponse = await this.client.generate({
        prompt: latestApiMessage,
        messages: history,
        model: `vertexai/${this.modelName}`,
        config: {
          topP: options.topP,
          topK: options.topK,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
          safetySettings: config.safetySettings,
        },
      });

      // @ts-expect-error - passing in the model as a string means no config schema available in types
      if (llmResponse.custom?.candidates?.[0]?.safetyRatings) {
        return {
          response: llmResponse.text,
          candidates: [],
          // @ts-expect-error - passing in the model as a string means no config schema available in types
          safetyMetadata: llmResponse.custom.candidates[0].safetyRatings,
          history,
        };
      }

      return {
        response: llmResponse.text,
        candidates: [],
        history,
      };
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }
}
