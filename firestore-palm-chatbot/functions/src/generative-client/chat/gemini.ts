import {DiscussionClient, Message} from './base_class';
import {GoogleGenerativeAI} from '@google/generative-ai';

interface GeminiChatOptions {
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

type ApiMessage = {
  role: string;
  parts: {
    text: string;
  }[];
};

enum Role {
  USER = 'user',
  GEMINI = 'assistant',
}

export class GeminiDiscussionClient extends DiscussionClient<
  GoogleGenerativeAI,
  GeminiChatOptions,
  ApiMessage
> {
  modelName: string;
  constructor({apiKey, modelName}: {apiKey?: string; modelName: string}) {
    super();
    if (!apiKey) {
      throw new Error('API key required.');
    }
    if (!modelName) {
      throw new Error('Model name required.');
    }
    this.modelName = modelName;
    this.client = new GoogleGenerativeAI(apiKey);
  }

  createLatestApiMessage(messageContent: string): ApiMessage {
    return {
      role: Role.USER,
      parts: [{text: messageContent}],
    };
  }

  async generateResponse(
    history: Message[],
    latestApiMessage: ApiMessage,
    _options: GeminiChatOptions
  ) {
    if (!this.client) {
      throw new Error('Client not initialized.');
    }
    const model = await this.client.getGenerativeModel({
      model: this.modelName,
    });
    const contents = [...this.messagesToApi(history), latestApiMessage];

    const result = await model.generateContent({
      contents,
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
      response: text,
      candidates: [text!],
      safetyMetadata: promptFeedback,
      history,
    };
  }

  private messagesToApi(messages: Message[]) {
    const out = [];
    for (const message of messages) {
      if (!message.prompt || !message.response) {
        // logs.warnMissingPromptOrResponse(message.path!);
        continue;
      }
      out.push({role: Role.USER, parts: [{text: message.prompt!}]});
      out.push({role: Role.GEMINI, parts: [{text: message.response!}]});
    }
    return out;
  }
}
