// import {
//   GoogleGenerativeAI,
//   HarmCategory,
//   HarmBlockThreshold,
// } from '@google/generative-ai-web';

import {GoogleGenerativeAI} from '@google/generative-ai';
import {GenerativeClient} from './base_text_client';

export class GeminiGenerativeClient extends GenerativeClient<
  any,
  GoogleGenerativeAI
> {
  apiKey: string;
  modelName: string;

  constructor({apiKey, modelName}: {apiKey: string; modelName: string}) {
    super();
    this.apiKey = apiKey;
    this.client = new GoogleGenerativeAI(this.apiKey);
    this.modelName = modelName;
  }

  async generate(promptText: string, _options: any): Promise<any> {
    if (!this.client) {
      throw new Error('Gemini Client not initialized.');
    }

    const model = await this.client.getGenerativeModel({
      model: this.modelName,
    });

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptText,
            },
          ],
        },
      ],
    });
    const candidates = result.response.candidates;

    if (!candidates || candidates.length === 0) {
      // TODO: handle blocked responses
      throw new Error('No candidates returned');
    }

    const firstCandidate = candidates[0];

    const content = firstCandidate.content;

    const parts = content.parts;

    const text = parts[0].text;

    const promptFeedback = result.response.promptFeedback;

    return {
      candidates: [text],
      safetyMetadata: promptFeedback,
    };
  }
}
