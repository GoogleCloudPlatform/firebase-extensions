import {DiscussionClient, Message} from './base_class';
import {logger} from 'firebase-functions/v1';
import {genkit, Genkit, MessageData, Part} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
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
  //TODO where to get these from Genkit?
}

const ai = genkit({
  plugins: [
    googleAI({
      apiKey: config.googleAi.apiKey,
    }),
  ],
});

export class GeminiDiscussionClient extends DiscussionClient<
  Genkit,
  GeminiChatOptions
> {
  modelName: string;

  constructor({apiKey, modelName}: {apiKey?: string; modelName: string}) {
    super(ai);
    if (!apiKey) {
      throw new Error('API key required.');
    }
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
        model: `googleai/${this.modelName}`,
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
