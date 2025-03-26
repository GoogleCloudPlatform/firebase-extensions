import {GenerativeClient, GenerativeResponse} from './base_client';
import {logger} from 'firebase-functions/v1';
import {
  genkit,
  MessageData,
  type GenerateOptions,
  type Genkit,
  type ModelReference,
} from 'genkit';
import {GenkitPlugin} from 'genkit/plugin';
import {
  googleAI,
  PluginOptions as PluginOptionsGoogleAI,
  gemini15Flash8b as gemini15Flash8bGoogleAI,
  gemini20Flash as gemini20FlashGoogleAI,
  gemini20FlashLite as gemini20FlashLiteGoogleAI,
  gemini20FlashExp as gemini20FlashExpGoogleAI,
  gemini20ProExp0205 as gemini20ProExp0205GoogleAI,
  gemini10Pro as gemini10ProGoogleAI,
  gemini15Flash as gemini15FlashGoogleAI,
  gemini15Pro as gemini15ProGoogleAI,
} from '@genkit-ai/googleai';
import {
  vertexAI,
  PluginOptions as PluginOptionsVertexAI,
  gemini20Flash as gemini20FlashVertexAI,
  gemini20FlashLite as gemini20FlashLiteVertexAI,
  gemini20ProExp0205 as gemini20ProExp0205VertexAI,
  gemini20Flash001 as gemini20Flash001VertexAI,
  gemini20FlashLitePreview0205 as gemini20FlashLitePreview0205VertexAI,
  gemini10Pro as gemini10ProVertexAI,
  gemini15Flash as gemini15FlashVertexAI,
  gemini15Pro as gemini15ProVertexAI,
} from '@genkit-ai/vertexai';
import {getImageBase64} from './image_utils';
import type {Config} from '../config';

export class GenkitGenerativeClient extends GenerativeClient<
  GenerateOptions,
  Genkit
> {
  private provider: string;
  private generateOptions: GenerateOptions;
  private pluginOptions: PluginOptionsGoogleAI | PluginOptionsVertexAI;
  private plugin: GenkitPlugin;
  client: Genkit;

  constructor(config: Config) {
    super();
    this.provider = config.provider;
    this.pluginOptions = this.getPluginOptions(config);
    this.plugin = this.initializePlugin();
    this.client = this.initializeGenkit();
    this.generateOptions = this.createGenerateOptions(config);
  }

  //   We use this to check before creating the client to see if we should use the Genkit client
  static shouldUseGenkitClient(config: Config): boolean {
    if (config.model.includes('pro-vision')) return false;
    const shouldReturnMultipleCandidates =
      config.candidates.shouldIncludeCandidatesField;
    return (
      !shouldReturnMultipleCandidates &&
      !!GenkitGenerativeClient.createModelReference(
        config.model,
        config.provider
      )
    );
  }

  private getPluginOptions(config: Config) {
    if (this.provider === 'google-ai') {
      if (!config.googleAi.apiKey) {
        throw new Error('API key required for Google AI.');
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
    throw new Error('Invalid provider specified.');
  }

  private initializeGenkit(): Genkit {
    return genkit({
      plugins: [this.plugin],
    });
  }

  static createModelReference(
    model: string,
    provider: string
  ): ModelReference<any> | null {
    const modelReferences =
      provider === 'google-ai'
        ? [
            gemini10ProGoogleAI,
            gemini15FlashGoogleAI,
            gemini15ProGoogleAI,
            gemini20FlashGoogleAI,
            gemini20FlashLiteGoogleAI,
            gemini20FlashExpGoogleAI,
            gemini20ProExp0205GoogleAI,
          ]
        : [
            gemini10ProVertexAI,
            gemini15FlashVertexAI,
            gemini15ProVertexAI,
            gemini20FlashVertexAI,
            gemini20FlashLiteVertexAI,
            gemini20ProExp0205VertexAI,
            gemini20Flash001VertexAI,
            gemini20FlashLitePreview0205VertexAI,
          ];

    const pluginName = provider === 'google-ai' ? 'googleai' : 'vertexai';

    for (const modelReference of modelReferences) {
      if (modelReference.name === `${pluginName}/${model}`) {
        return modelReference;
      }
      if (modelReference.info?.versions?.includes(model)) {
        return modelReference.withVersion(model);
      }
    }
    return null;
  }

  private createGenerateOptions(config: Config): GenerateOptions {
    if (!config.model) {
      throw new Error('Model must be specified in the configuration.');
    }

    const modelRef = GenkitGenerativeClient.createModelReference(
      config.model,
      config.provider!
    );

    if (!modelRef) {
      throw new Error('Model reference not found.');
    }

    return {
      model: modelRef,
      config: {
        topP: config.topP,
        topK: config.topK,
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        safetySettings: config.safetySettings,
      },
    };
  }

  async generate(
    promptText: string,
    options?: GenerateOptions & {image?: string}
  ): Promise<GenerativeResponse> {
    if (!this.client) {
      throw new Error('Genkit client is not initialized.');
    }

    const generateOptions = {...this.generateOptions, ...options};

    let imageBase64: string | undefined;

    if (options?.image) {
      try {
        imageBase64 = await getImageBase64(
          options.image,
          this.provider as 'google-ai' | 'vertex-ai'
        );
      } catch (error) {
        logger.error('Failed to process image:', error);
        throw new Error('Image processing failed.');
      }
    }

    const message: MessageData = {
      role: 'user',
      content: [{text: promptText}], // Initialize with the prompt text
    };

    if (imageBase64) {
      const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

      // Push additional content into the same message's content array
      message.content.push({media: {url: dataUrl}});
    }
    try {
      const response = await this.client.generate({
        messages: [message],
        ...generateOptions,
      });

      if (!response.text) {
        throw new Error('No text generated.');
      }

      return {
        candidates: [response.text],
      };
    } catch (error) {
      logger.error('Failed to generate content:', error);
      throw new Error('Content generation failed.');
    }
  }
}
