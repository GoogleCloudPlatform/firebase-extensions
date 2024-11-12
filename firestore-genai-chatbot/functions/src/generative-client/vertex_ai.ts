import {logger} from 'firebase-functions/v1';

import {Part, MessageData, Genkit, genkit} from 'genkit';
import {DiscussionClient} from './base_class';
import {Message} from '../types';
import vertexAI from '@genkit-ai/vertexai';

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

type ApiMessage = {
  role: string;
  parts: Part[];
};

const ai = genkit({
  plugins: [vertexAI()],
});

export class VertexDiscussionClient extends DiscussionClient<
  Genkit,
  GeminiChatOptions,
  ApiMessage
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
