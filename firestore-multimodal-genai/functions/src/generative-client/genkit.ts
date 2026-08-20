/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
import {enableFirebaseTelemetry} from '@genkit-ai/firebase';

export class GenkitGenerativeClient extends GenerativeClient<
  GenerateOptions,
  Genkit
> {
  private provider: string;
  private imageField?: string;
  private generateOptions: GenerateOptions;
  private pluginOptions: VertexPluginOptions | GoogleAIPluginOptions;
  private plugin: GenkitPluginV2;
  client: Genkit;

  constructor(config: Config) {
    super();
    this.provider = config.provider;
    this.imageField = config.imageField;
    this.pluginOptions = this.getPluginOptions(config);
    this.plugin = this.initializePlugin();
    this.client = this.initializeGenkit(config);
    this.generateOptions = this.createGenerateOptions(config);
  }

  /** Whether the Genkit client can serve this config (single candidate). */
  static shouldUseGenkitClient(config: Config): boolean {
    return !config.candidates.shouldIncludeCandidatesField;
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

    const pluginConfig: VertexPluginOptions = {
      location: config.vertexAiLocation,
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

    if (config.enableGenkitMonitoring) {
      try {
        enableFirebaseTelemetry();
        logger.info('Genkit Monitoring enabled');
      } catch (error) {
        logger.error('Failed to enable Genkit Monitoring', error);
      }
    }

    return genkit(genkitConfig);
  }

  /**
   * Resolves a Genkit model reference via `googleAI.model()` / `vertexAI.model()`.
   * Any id is passed through so current Gemini releases work without a package update.
   */
  static createModelReference(
    model: string,
    provider: string
  ): ModelReference<any> {
    return provider === 'google-ai'
      ? googleAI.model(model)
      : vertexAI.model(model);
  }

  private createGenerateOptions(config: Config): GenerateOptions {
    if (!config.model) {
      throw new Error('Model must be specified in the configuration.');
    }

    return {
      model: GenkitGenerativeClient.createModelReference(
        config.model,
        config.provider!
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

  /**
   * Folds per-call overrides into the stored options.
   *
   * `safetySettings` reaches us at the top level (see `generateOnCall` in
   * index.ts) but Genkit only reads it from `config`, so a plain spread would
   * silently drop caller overrides.
   */
  private mergeGenerateOptions(
    options?: GenerateOptions & {image?: string; safetySettings?: unknown}
  ): GenerateOptions {
    const {safetySettings, ...rest} = options ?? {};
    return {
      ...this.generateOptions,
      ...rest,
      config: {
        ...this.generateOptions.config,
        ...(rest.config ?? {}),
        ...(safetySettings ? {safetySettings} : {}),
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

    const generateOptions = this.mergeGenerateOptions(options);

    let imageBase64: string | undefined;

    if (this.imageField && !options?.image) {
      throw new Error(
        'Image Field is configured, but this document has no image.'
      );
    }

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
