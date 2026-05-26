import {GenerativeClient} from './base_client';
import {logger} from 'firebase-functions/v1';
import {VertexAI, GenerateContentRequest, Part} from '@google-cloud/vertexai';
import config from '../config';
import {getImageBase64} from './image_utils';

enum Role {
  USER = 'user',
  GEMINI = 'model',
}

export class VertexLanguageClient extends GenerativeClient<any, VertexAI> {
  modelName: string;

  constructor({modelName}: {modelName: string}) {
    super();
    this.client = new VertexAI({
      project: config.projectId,
      location: config.vertexAiLocation,
    });

    this.modelName = modelName;
  }

  async generate(promptText: string, options: any): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini Client not initialized.');
    }

    const textPart: Part = {
      text: promptText,
    };
    const promptParts: Part[] = [textPart];

    if (config.imageField) {
      if (options.image) {
        promptParts.push({
          inlineData: {
            mimeType: 'image/png',
            data: await getImageBase64(options.image, 'vertex-ai'),
          },
        });
      }
    }

    const request: GenerateContentRequest = {
      contents: [
        {
          role: Role.USER,
          parts: promptParts,
        },
      ],
      generationConfig: {
        topK: options.topK,
        topP: options.topP,
        temperature: options.temperature,
        candidateCount: options.candidateCount,
        maxOutputTokens: options.maxOutputTokens,
      },
      safetySettings: options.safetySettings,
    };

    let result;

    const generativeModel = this.client.preview.getGenerativeModel({
      model: this.modelName,
    });
    try {
      const responseStream =
        await generativeModel.generateContentStream(request);

      const aggregatedResponse = await responseStream.response;

      result = aggregatedResponse;
    } catch (e) {
      logger.error(e);
      // TODO: the error message provided exposes the API key, so we should handle this/ get the Gemini team to fix it their side.
      throw new Error(
        'failed to generate content, see function logs for details'
      );
    }
    if (
      !result.candidates ||
      !Array.isArray(result.candidates) ||
      result.candidates.length === 0
    ) {
      // TODO: handle blocked responses
      throw new Error('No candidates returned');
    }

    const candidates = result.candidates.filter(c => {
      return (
        c &&
        c.content &&
        c.content.parts &&
        c.content.parts.length > 0 &&
        c.content.parts[0].text &&
        typeof c.content.parts[0].text === 'string'
      );
    });

    return {
      response: candidates[0]!.content!.parts![0].text!,
      candidates: candidates?.map(c => c.content!.parts![0].text!) ?? [],
      // TODO: add this as a feature:
      // safetyMetadata: promptFeedback,
    };
  }
}
