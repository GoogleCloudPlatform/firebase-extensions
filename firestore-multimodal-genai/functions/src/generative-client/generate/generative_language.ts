import {v1} from '@google-ai/generativelanguage';
import * as generativeLanguage from '@google-ai/generativelanguage';

import {GenerativeClient} from './base_text_client';
import * as admin from 'firebase-admin';
import {logger} from 'firebase-functions/v1';
import {GoogleAuth} from 'google-auth-library';
enum Role {
  USER = 'user',
  GEMINI = 'model',
}

enum ImageUrlSource {
  BASE64 = 'base64',
  STORAGE = 'storage',
}

// import IPart
type Part = generativeLanguage.protos.google.ai.generativelanguage.v1.IPart;

export class GeminiGenerativeClient extends GenerativeClient<
  any,
  v1.GenerativeServiceClient
> {
  apiKey?: string;
  modelName: string;

  constructor({apiKey, modelName}: {apiKey?: string; modelName: string}) {
    super();
    if (apiKey) {
      const authClient = new GoogleAuth().fromAPIKey(apiKey);
      this.client = new v1.GenerativeServiceClient({
        authClient,
      });
    } else {
      this.client = new v1.GenerativeServiceClient();
    }
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

    if (this.modelName === 'gemini-pro-vision') {
      if (!options.image) {
        throw new Error('Gemini Pro Vision selected, but missing Image Field');
      }

      const base64String = await getImageBase64(options.image);

      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: base64String,
        },
      };

      promptParts.push(imagePart);
    }
    let result;
    try {
      result = await this.client.generateContent({
        model: this.modelName,
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
      });
    } catch (e) {
      logger.error(e);
      // TODO: the error message provided exposes the API key, so we should handle this/ get the Gemini team to fix it their side.
      throw new Error(
        'failed to generate content, see function logs for details'
      );
    }

    const response = result[0];

    if (
      !response.candidates ||
      !Array.isArray(response.candidates) ||
      response.candidates.length === 0
    ) {
      // TODO: handle blocked responses
      throw new Error('No candidates returned');
    }

    const candidates = response.candidates.filter(c => {
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

function isBase64Image(image: string): boolean {
  return Buffer.from(image, 'base64').toString('base64') === image;
}

const isFromStorage = (image: string): boolean => {
  return image.startsWith('gs://');
};

function getImageSource(image: string): ImageUrlSource {
  if (isBase64Image(image)) {
    return ImageUrlSource.BASE64;
  }
  if (isFromStorage(image)) {
    return ImageUrlSource.STORAGE;
  }
  throw new Error(
    `Invalid image source: ${image}, only gs:// and base64 supported.`
  );
}

async function getImageBase64(image: string): Promise<string> {
  switch (getImageSource(image)) {
    case ImageUrlSource.BASE64:
      return image;
    case ImageUrlSource.STORAGE: {
      const buffer = (await getBufferFromStorage(image))[0];
      return buffer.toString('base64');
    }
    default:
      // TODO: handle this case properly and test
      throw new Error(
        'Image must be either a base64 string or a file in cloud storage.'
      );
  }
}

async function getBufferFromStorage(image: string) {
  // e.g from gs://invertase--palm-demo.appspot.com/the-matrix.jpeg
  // we get invertase--palm-demo.appspot.com
  const bucketName = extractBucketName(image);

  const fileName = image.split(bucketName + '/')[1];

  return admin.storage().bucket(bucketName).file(fileName).download();
}

function extractBucketName(url: string) {
  // Split the URL by '://'
  const parts = url.split('gs://');

  // Check if the URL is correctly formatted
  if (parts.length !== 2) {
    return 'Invalid URL format';
  }

  // Further split the second part by '/' to isolate the bucket name
  const bucketAndPath = parts[1].split('/', 1);
  const bucketName = bucketAndPath[0];

  return bucketName;
}
