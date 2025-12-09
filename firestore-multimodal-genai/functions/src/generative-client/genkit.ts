import {GenerativeClient, GenerativeResponse} from './base_client';
import {logger} from 'firebase-functions/v1';
import {
  genkit,
  MessageData,
  type GenerateOptions,
  type Genkit,
  type ModelReference,
} from 'genkit';
import {GenkitPluginV2} from 'genkit/plugin';
import {
  vertexAI,
  googleAI,
  GoogleAIPluginOptions,
} from '@genkit-ai/google-genai';
import {VertexPluginOptions} from '@genkit-ai/google-genai/lib/vertexai';
import {getImageBase64} from './image_utils';
import type {Config} from '../config';
// import {enableFirebaseTelemetry} from '@genkit-ai/firebase';

export class GenkitGenerativeClient extends GenerativeClient<
  GenerateOptions,
  Genkit
> {
  private provider: string;
  private generateOptions: GenerateOptions;
  private pluginOptions: VertexPluginOptions | GoogleAIPluginOptions;
  private plugin: GenkitPluginV2;
  client: Genkit;

  constructor(config: Config) {
    super();
    this.provider = config.provider;
    this.pluginOptions = this.getPluginOptions(config);
    this.plugin = this.initializePlugin();
    this.client = this.initializeGenkit(config);
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
      const pluginConfig: GoogleAIPluginOptions = {
        apiKey: config.googleAi.apiKey,
      };
      return pluginConfig;
    }

    const isGlobal = config.vertexProviderLocation === 'global';

    const pluginConfig: VertexPluginOptions = {
      location: isGlobal ? 'global' : config.location,
    };
    return pluginConfig;
  }

  private initializePlugin(): GenkitPluginV2 {
    if (this.provider === 'google-ai') {
      return googleAI(this.pluginOptions);
    }
    if (this.provider === 'vertex-ai') {
      return vertexAI(this.pluginOptions);
    }
    throw new Error('Invalid provider specified.');
  }

  private initializeGenkit(config: Config): Genkit {
    const genkitConfig = {
      plugins: [this.plugin],
    };

    // if (config.enableGenkitMonitoring) {
    //   try {
    //     enableFirebaseTelemetry();
    //     logger.info('Genkit Monitoring enabled');
    //   } catch (error) {
    //     logger.error('Failed to enable Genkit Monitoring', error);
    //   }
    // }

    return genkit(genkitConfig);
  }

  static createModelReference(
    model: string,
    provider: string
  ): ModelReference<any> | null {
    const modelReferences =
      provider === 'google-ai'
        ? [
            googleAI.model('gemini-1.5-flash'),
            googleAI.model('gemini-1.5-pro'),
            googleAI.model('gemini-2.0-flash'),
            googleAI.model('gemini-2.0-flash-lite'),
            googleAI.model('gemini-2.5-flash-lite'),
            googleAI.model('gemini-2.5-flash'),
            googleAI.model('gemini-2.5-pro'),
            googleAI.model('gemini-3-pro-preview'),
          ]
        : [
            vertexAI.model('gemini-1.5-flash'),
            vertexAI.model('gemini-1.5-pro'),
            vertexAI.model('gemini-2.0-flash'),
            vertexAI.model('gemini-2.0-flash-lite'),
            vertexAI.model('gemini-2.0-flash-001'),
            vertexAI.model('gemini-2.5-flash-lite'),
            vertexAI.model('gemini-2.5-flash'),
            vertexAI.model('gemini-2.5-pro'),
            vertexAI.model('gemini-3-pro-preview'),
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
