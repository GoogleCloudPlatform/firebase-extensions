import {MessageData} from 'genkit';

export interface Message {
  path?: string;
  prompt?: string;
  response?: string;
}

export interface ChatResponse {
  response: string;
  candidates: string[];
  //TODO: fix this type
  safetyMetadata?: any;
  history: MessageData[];
}

export abstract class DiscussionClient<
  Genkit,
  ChatOptions extends {
    history?: Message[];
    context?: string;
  },
  ApiMessage,
> {
  client: Genkit;
  constructor(client: Genkit) {
    this.client = client;
  }

  private getHistory(options: ChatOptions) {
    return (
      (options.history?.map(i => {
        return {
          content: {
            text: i.prompt || i.response,
          },
          role: i.prompt ? 'user' : 'model',
        };
      }) as MessageData[] | undefined) ?? []
    );
  }

  async send(
    messageContent: string,
    options: ChatOptions
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const history = this.getHistory(options);
    const latestApiMessage = this.createApiMessage(messageContent);
    return await this.generateResponse(history, latestApiMessage, options);
  }

  createApiMessage(
    _messageContent: string,
    _role: 'user' | 'model' = 'user'
  ): ApiMessage {
    throw new Error('Method Not implemented');
  }

  async generateResponse(
    _history: MessageData[],
    _latestApiMessage: ApiMessage,
    _options: ChatOptions
  ): Promise<ChatResponse> {
    throw new Error('Not implemented');
  }
}
