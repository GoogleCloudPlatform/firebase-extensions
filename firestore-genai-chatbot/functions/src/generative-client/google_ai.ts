import {DiscussionClient, Message} from './base_class';
import {GoogleGenerativeAI, InputContent} from '@google/generative-ai';
import {logger} from 'firebase-functions/v1';

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
  GEMINI = 'model',
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

    const model = this.client.getGenerativeModel({
      model: this.modelName,
    });

    const chatSession = model.startChat({
      history: this.messagesToApi(history),
      generationConfig: {
        topP: _options.topP,
        topK: _options.topK,
        temperature: _options.temperature,
        maxOutputTokens: _options.maxOutputTokens,
        candidateCount: _options.candidateCount,
      },
    });

    let result;
    try {
      result = await chatSession.sendMessage(latestApiMessage.parts[0].text);
    } catch (e) {
      logger.error(e);
      // TODO: the error message provided exposes the API key, so we should handle this/ get the Gemini team to fix it their side.
      throw new Error(
        'Failed to generate response, see function logs for more details.'
      );
    }

    const text = result.response.text();

    if (!text) {
      throw new Error('No text returned candidate');
    }

    return {
      response: text,
      candidates:
        result.response.candidates?.map(c => c.content.parts[0].text ?? '') ??
        [],
      safetyMetadata: result.response.promptFeedback,
      history,
    };
  }

  private messagesToApi(messages: Message[]) {
    const out: InputContent[] = [];
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
