import {
  gemini10Pro as gemini10ProGoogleAI,
  gemini15Flash as gemini15FlashGoogleAI,
  gemini15Pro as gemini15ProGoogleAI,
  googleAI,
  PluginOptions as PluginOptionsGoogleAI,
} from '@genkit-ai/googleai';

import vertexAI, {
  gemini10Pro as gemini10ProVertexAI,
  gemini15Flash as gemini15FlashVertexAI,
  gemini15Pro as gemini15ProVertexAI,
  PluginOptions as PluginOptionsVertexAI,
} from '@genkit-ai/vertexai';
import type {Config} from '../config';
import {
  genkit,
  MessageData as ApiMessage,
  type GenerateOptions,
  type Genkit,
  type ModelReference,
} from 'genkit';
import {ChatResponse, DiscussionClient, Message} from './base_class';
import {GenkitPlugin} from 'genkit/plugin';
import {logger} from 'firebase-functions/v1';

export class GenkitDiscussionClient extends DiscussionClient<
  Genkit,
  any,
  ApiMessage
> {
  private provider: 'google-ai' | 'vertex-ai';
  private generateOptions: GenerateOptions;
  client: Genkit;
  private pluginOptions: PluginOptionsGoogleAI | PluginOptionsVertexAI;
  private plugin: GenkitPlugin;

  constructor(config: Config) {
    super();
    this.provider = config.provider;
    this.pluginOptions = this.getPluginOptions(config);
    this.plugin = this.initializePlugin();
    this.client = this.initializeGenkit();
    this.generateOptions = this.createGenerateOptions(config);
  }

  private getPluginOptions(config: Config) {
    if (this.provider === 'google-ai') {
      if (!config.googleAi.apiKey) {
        throw new Error('API key required.');
      }
      const pluginConfig: PluginOptionsGoogleAI = {
        apiKey: config.googleAi.apiKey,
      };
      return pluginConfig;
    }
    const pluginConfig: PluginOptionsVertexAI = {
      location: config.location,
    };
    return pluginConfig;
  }

  private initializePlugin(): GenkitPlugin {
    if (this.provider === 'google-ai') {
      return googleAI(this.pluginOptions as PluginOptionsGoogleAI);
    }
    if (this.provider === 'vertex-ai') {
      return vertexAI(this.pluginOptions as PluginOptionsVertexAI);
    }
    throw new Error('Invalid provider.');
  }

  private initializeGenkit(): Genkit {
    return genkit({
      plugins: [this.plugin],
    });
  }

  static createModelReference(
    model: string,
    provider: string
  ): ModelReference<any> {
    const modelReferences =
      provider === 'google-ai'
        ? [gemini10ProGoogleAI, gemini15FlashGoogleAI, gemini15ProGoogleAI]
        : [gemini10ProVertexAI, gemini15FlashVertexAI, gemini15ProVertexAI];

    const pluginName = provider === 'google-ai' ? 'googleai' : 'vertexai';

    for (const modelReference of modelReferences) {
      if (modelReference.name === `${pluginName}/${model}`) {
        return modelReference;
      }
      if (modelReference.info?.versions?.includes(model)) {
        return modelReference.withVersion(model);
      }
    }
    throw new Error('Model not found.');
  }

  private createGenerateOptions(config: Config): GenerateOptions {
    if (!config.model) {
      throw new Error('Model not found.');
    }

    return {
      model: GenkitDiscussionClient.createModelReference(
        config.model,
        config.provider
      ),
      config: {
        topP: config.topP,
        topK: config.topK,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        safetySettings: config.safetySettings,
      },
    };
  }

  //   We use this to check before creating the client to see if we should use the Genkit client
  static shouldUseGenkitClient(config: Config): boolean {
    const shouldReturnMultipleCandidates =
      config.candidateCount && config.candidateCount > 1;
    return (
      !shouldReturnMultipleCandidates &&
      !!GenkitDiscussionClient.createModelReference(
        config.model,
        config.provider
      )
    );
  }

  async generateResponse(
    history: Message[],
    latestApiMessage: any,
    _options: any
  ): Promise<ChatResponse> {
    logger.debug('Generating response with Genkit');

    const messages = this.messagesToApi(history);

    const llmResponse = await this.client.generate({
      messages,
      prompt: latestApiMessage.content[0].text,
      ...this.generateOptions,
    });

    return {
      response: llmResponse.text,
      candidates: [llmResponse.text],
      history,
    };
  }

  createApiMessage(
    messageContent: string,
    role: 'user' | 'model' = 'user'
  ): ApiMessage {
    const apiRole = role === 'user' ? 'user' : 'model';

    return {
      role: apiRole,
      content: [{text: messageContent}],
    };
  }

  messagesToApi(messages: Message[]): ApiMessage[] {
    const out: ApiMessage[] = [];
    for (const message of messages) {
      if (!message.prompt || !message.response) {
        continue;
      }
      out.push({role: 'user', content: [{text: message.prompt}]});
      out.push({role: 'model', content: [{text: message.response}]});
    }
    return out;
  }
}
