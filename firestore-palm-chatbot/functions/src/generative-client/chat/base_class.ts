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
  ApiMessage,
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

  async send(
    messageContent: string,
    options: ChatOptions
  ): Promise<ChatResponse> {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const history = this.getHistory(options);
    const latestApiMessage = this.createLatestApiMessage(messageContent);
    return await this.generateResponse(history, latestApiMessage, options);
  }

  createLatestApiMessage(_messageContent: string): ApiMessage {
    throw new Error('Not implemented');
  }

  async generateResponse(
    _history: Message[],
    _latestApiMessage: ApiMessage,
    _options: ChatOptions
  ): Promise<ChatResponse> {
    throw new Error('Not implemented');
  }
}
