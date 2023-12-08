export interface Message {
  path?: string;
  prompt?: string;
  response?: string;
}

export interface ChatResponse {
  response?: string;
  candidates: string[];
  //TODO: fix this type
  safetyMetadata?: any;
  history: Message[];
}

export abstract class DiscussionClient<
  Client,
  ChatOptions extends {
    history?: Message[];
  },
> {
  client?: Client;
  constructor() {}

  private getHistory(options: ChatOptions) {
    let history: Message[] = [];
    if (options.history) {
      history = options.history;
    }
    return history;
  }

  async send(message: Message, options: ChatOptions): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const history = this.getHistory(options);
    const messages = [...history, message];
    return await this.generateResponse(messages, options);
  }

  async generateResponse(
    _messages: Message[],
    _options: ChatOptions
  ): Promise<ChatResponse> {
    throw new Error('Not implemented');
  }
}
