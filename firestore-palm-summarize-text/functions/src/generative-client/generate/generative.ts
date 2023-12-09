import {GenerativeClient} from './base_text_client';
import {TextServiceClient} from '@google-ai/generativelanguage';
import {GoogleAuth} from 'google-auth-library';

export interface TextGeneratorOptions {
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  apiKey?: string;
  context?: string;
  // TODO: remove any
  safetySettings: any;
}

export class PalmGenerativeClient extends GenerativeClient<
  any,
  TextServiceClient
> {
  context?: string;
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  apiKey?: string;
  safetySettings: any;

  constructor(options: TextGeneratorOptions) {
    super();
    this.context = options.context;
    this.model = options.model;
    this.temperature = options.temperature;
    this.topP = options.topP;
    this.topK = options.topK;
    this.candidateCount = options.candidateCount;

    if (this.apiKey) {
      //   logs.usingAPIKey();
      const authClient = new GoogleAuth().fromAPIKey(this.apiKey);
      this.client = new TextServiceClient({
        authClient,
      });
    } else {
      //   logs.usingADC();
      const auth = new GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/generative-language',
        ],
      });
      this.client = new TextServiceClient({
        auth,
      });
    }
  }

  async generate(promptText: string, options: any): Promise<any> {
    if (!this.client) {
      throw new Error('Generative Language Client not initialized.');
    }
    const request = {
      prompt: {
        text: promptText,
      },
      model: `models/${this.model}`,
      ...options,
      safetySettings: this.safetySettings || options.safetySettings || [],
    };

    const [result] = await this.client.generateText(request);

    const {candidates, filters, safetyFeedback} = result;
    const blocked = !!filters && filters.length > 0;
    const safetyMetadata = {
      blocked,
      safetyFeedback,
    };
    if (blocked) {
      return {
        candidates: [],
        safetyMetadata,
      };
    }

    if (!candidates || !Array.isArray(candidates) || !candidates.length) {
      throw new Error('No candidates returned from Generative Language.');
    }
    return {
      candidates: candidates.map(candidate => candidate.output),
      safetyMetadata,
    };
  }
}
