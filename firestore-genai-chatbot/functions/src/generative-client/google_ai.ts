import {DiscussionClient, Message} from './base_class';
import {logger} from 'firebase-functions/v1';
import {genkit, Genkit, MessageData} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

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
  // safetySettings: SafetySetting[];
}

type ApiMessage = {
  role: string;
  parts: {
    text: string;
  }[];
};

const ai = genkit({
  plugins: [googleAI()],
});

export class GeminiDiscussionClient extends DiscussionClient<
  Genkit,
  GeminiChatOptions,
  ApiMessage
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
    latestApiMessage: ApiMessage,
    options: GeminiChatOptions
  ) {
    try {
      const llmResponse = await this.client!.generate({
        prompt: latestApiMessage.parts,
        messages: history,
        model: this.modelName,
        config: {
          topP: options.topP,
          topK: options.topK,
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens,
        },
      });

      return {
        response: llmResponse.text,
        // TODO how to handle candidates through genkit?
        candidates: [],
        // TODO might be in "evaluations API of genkit" or might be here
        // safetyMetadata: llmResponse.
        history,
      };
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }
}
