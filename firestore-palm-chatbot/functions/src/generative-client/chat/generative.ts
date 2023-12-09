import {DiscussionClient, Message} from './base_class';
import {DiscussServiceClient} from '@google-ai/generativelanguage';
import {GoogleAuth} from 'google-auth-library';

interface PaLMChatOptions {
  history?: Message[];
  model?: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  projectId: string;
  location: string;
  context?: string;
  examples?: any[];
}

interface ApiMessage {
  /** Message author */
  author?: string | null;

  /** Message content */
  content?: string | null;
}

export class PalmDiscussionClient extends DiscussionClient<
  DiscussServiceClient,
  PaLMChatOptions,
  ApiMessage
> {
  model: string;
  context?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  candidateCount?: number;
  examples?: any[];

  constructor({
    apiKey,
    model,
    context,
    temperature,
    topP,
    topK,
    candidateCount,
    examples,
  }: {
    apiKey?: string;
    model: string;
    context?: string;
    temperature?: number;
    topP?: number;
    topK?: number;
    candidateCount?: number;
    examples?: any[];
  }) {
    super();
    this.model = model;
    this.context = context;
    this.temperature = temperature;
    this.topP = topP;
    this.topK = topK;
    this.candidateCount = candidateCount;
    this.examples = examples;

    if (apiKey) {
      //   logs.usingAPIKey();
      const authClient = new GoogleAuth().fromAPIKey(apiKey);
      this.client = new DiscussServiceClient({
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
      this.client = new DiscussServiceClient({
        auth,
      });
    }
  }

  async generateResponse(
    history: Message[],
    latestApiMessage: ApiMessage,
    options: PaLMChatOptions
  ) {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }

    const messages = [...this.messagesToApi(history), latestApiMessage];

    const prompt = {
      messages,
      context: options.context || this.context || '',
      examples: options.examples || this.examples || [],
      //TODO: examples
    };

    const request = {
      prompt,
      model: options.model || this.model,
      temperature: options.temperature || this.temperature,
      topP: options.topP || this.topP,
      topK: options.topK || this.topK,
      candidateCount: options.candidateCount || this.candidateCount,
    };

    const result = (await this.client.generateMessage(request))[0];

    if (result.filters && result.filters.length) {
      throw new Error(
        'Chat prompt or response filtered by the PaLM API content filter.'
      );
    }

    if (!result.candidates || !result.candidates.length) {
      throw new Error('No candidates returned from server.');
    }

    const content = result.candidates[0].content;

    const candidates = result.candidates!.map(c => c.content!);

    if (!content) {
      throw new Error('No content returned from server.');
    }

    return {
      response: content,
      candidates,
      safetyMetadata: {},
      history: history,
    };
  }

  createLatestApiMessage(messageContent: string): ApiMessage {
    return {author: '0', content: messageContent};
  }

  private messagesToApi(messages: Message[]): ApiMessage[] {
    const out = [];
    for (const message of messages) {
      if (!message.prompt || !message.response) {
        // logs.warnMissingPromptOrResponse(message.path!);
        continue;
      }
      out.push({author: '0', content: message.prompt});
      out.push({author: '1', content: message.response});
    }
    return out;
  }
}
