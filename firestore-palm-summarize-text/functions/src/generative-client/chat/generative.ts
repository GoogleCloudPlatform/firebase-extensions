import {DiscussionClient, Message} from './base_chat_client';
import {DiscussServiceClient} from '@google-ai/generativelanguage';
import {GoogleAuth} from 'google-auth-library';

interface PaLMChatOptions {
  history?: Message[];
  model: string;
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  projectId: string;
  location: string;
  context?: string;
}

export class PalmDiscussionClient extends DiscussionClient<
  DiscussServiceClient,
  PaLMChatOptions
> {
  constructor({apiKey}: {apiKey?: string}) {
    super();

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

  async generateResponse(messages: Message[], options: PaLMChatOptions) {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const prompt = {
      messages: this.messagesToApi(messages),
      context: options.context || '',
      //TODO: examples
    };

    const request = {
      prompt,
      model: options.model,
      temperature: options.temperature,
      topP: options.topP,
      topK: options.topK,
      candidateCount: options.candidateCount,
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
    const _messagesReturned = result.messages || [];

    return {
      response: content,
      candidates,
      safetyMetadata: {},
      history: messages,
    };
  }

  private messagesToApi(messages: Message[]) {
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
