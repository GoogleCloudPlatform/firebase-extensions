import {GenerativeClient, GenerativeResponse} from './base_client';
import {generate} from '@genkit-ai/ai';
import {gemini15Pro, gemini15Flash, vertexAI} from '@genkit-ai/vertexai';
import {configureGenkit} from '@genkit-ai/core';
import config from '../config';

export interface GenkitClientOptions {
  modelName: string;
  temperature?: number;
  topK?: number;
  topP?: number;
  candidateCount?: number;
  maxOutputTokens?: number;
  image?: string;
  safetySettings?: {
    category: string;
    threshold: string;
  }[];
}

export class GenkitVertexAIClient extends GenerativeClient<
  GenkitClientOptions,
  any
> {
  constructor() {
    super();

    // Initialize Genkit for Vertex AI
    configureGenkit({
      plugins: [vertexAI()],
      logLevel: 'debug',
      enableTracingAndMetrics: true,
    });
  }

  // Function to get the correct Vertex AI Gemini model based on modelName
  getModel(modelName: string) {
    switch (modelName) {
      // TODO: support other models
      case 'gemini-1.5-pro':
        return gemini15Pro;
      case 'gemini-1.5-flash':
        return gemini15Flash;
      default:
        throw new Error(`Unsupported model: ${modelName}`);
    }
  }

  async generate(
    promptText: string,
    options: GenkitClientOptions
  ): Promise<GenerativeResponse> {
    const model = this.getModel(options.modelName); // Get the correct model

    // Prepare image handling if provided
    const promptParts: string[] = [promptText];
    if (config.imageField && options.image) {
      promptParts.push(options.image); // Image as base64 string or URL
    }

    // Call Genkit's generate function
    const llmResponse = await generate({
      model,
      config: {
        temperature: options.temperature || 0.5,
        topK: options.topK || undefined,
        topP: options.topP || undefined,
        // TODO: support candidateCount
        // candidateCount: options.ca || 1,
        maxOutputTokens: options.maxOutputTokens || 1024,
        // TODO: support safetySettings
        // safetySettings: options.safetySettings || undefined, // Pass safety settings if provided
      },
      prompt: promptParts.join('\n'),
    });

    if (!llmResponse.candidates || llmResponse.candidates.length === 0) {
      throw new Error('No candidates returned');
    }

    // Extract safetyMetadata and block status from promptFeedback
    const promptFeedback = (
      llmResponse.custom as {
        promptFeedback?: {safetyRatings: any[]; blockReason: string};
      }
    )?.promptFeedback;
    const safetyMetadata = promptFeedback?.safetyRatings || [];

    // Check if the prompt was blocked
    const blocked = promptFeedback?.blockReason === 'SAFETY';

    // Return response with candidates and safetyMetadata
    return {
      response: llmResponse.candidates[0].text(), // First candidate's text
      candidates: llmResponse.candidates.map(candidate => candidate.text()),
      safetyMetadata: {safetyRatings: safetyMetadata, blocked}, // Include whether the prompt was blocked
    };
  }
}
