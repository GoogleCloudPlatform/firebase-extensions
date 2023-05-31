/**
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {DiscussServiceClient} from '@google-ai/generativelanguage';
import * as logs from './logs';
import {GoogleAuth} from 'google-auth-library';
import {APIGenerateMessageRequest, APIMessage, APIExample} from './types';
export interface Message {
  path?: string;
  prompt?: string;
  response?: string;
}

export interface DiscussionOptions {
  /**
   * Any text that should be provided to the model to ground the response.
   * If not empty, this will be the given to the model first.
   * This can be a description of your prompt to the model to help provide
   * context and guide the responses. Examples: "Translate the phrase from
   * English to French." or "Given a statement, classify the sentiment as happy,
   * sad or neutral."
   */
  context?: string;
  /**
   * Instructions or examples of what the model should generate in response to
   * the input message. This includes both sample user input and model output
   * the model should emulate.
   */
  examples?: Message[];
  /**
   * Overrides the default API endpoint.
   */
  apiOrigin?: string;
  /**
   * Provide a model id to use for this discussion. Defaults to 'lamda_api'.
   */
  model?: string;
  /**
   * Set temperature for this discussion.
   */
  temperature?: number;
  /**
   * Set P for this discussion.
   */
  topP?: number;
  /**
   * Set topK for this discussion.
   */
  topK?: number;
  /**
   * Set candidateCount for this discussion.
   **/
  candidateCount?: number;
}

export interface GenerateMessageOptions {
  /**
   * Provide a message history to continue a conversation.
   */
  history?: Message[];
  /**
   * Set or override temperature for this request.
   */
  temperature?: number;
  /**
   * Set or override temperature for this request.
   */
  topP?: number;
  /**
   * Set or override temperature for this request.
   */
  topK?: number;
  /**
   * Set or override context context for this request.
   */
  context?: string;
  /**
   * Adds additional examples if specified.
   */
  examples?: Message[];
  /**
   * Select or override the model for this request.
   */
  model?: string;
  /**
   * Set candidateCount for this discussion.
   **/
  candidateCount?: number;
  /**
   * Pass a previously returned response to continue a conversation.
   */
  continue?: GenerateMessageResponse;
}

export interface GenerateMessageResponse {
  response: string;
  history: Message[];
  candidates: string[];
}

export class Discussion {
  private client: DiscussServiceClient;
  context?: string;
  examples?: Message[] = [];
  model = 'models/chat-bison-001';
  temperature?: number;
  candidateCount?: number;
  topP?: number;
  topK?: number;

  constructor(options: DiscussionOptions = {}) {
    this.context = options.context;
    this.examples = options.examples || [];
    this.temperature = options.temperature;
    this.topP = options.topP;
    this.topK = options.topK;
    this.candidateCount = options.candidateCount;
    if (options.model) this.model = options.model;
    logs.usingADC();

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

  async send(
    prompt: string,
    options: GenerateMessageOptions = {}
  ): Promise<GenerateMessageResponse> {
    let history: Message[] = [];
    if (options.continue) {
      history = [...options.continue.history];
      history[history.length - 1].response = options.continue.response;
    } else if (options.history) {
      history = options.history;
    }

    const messages = [
      ...this.messagesToApi(history),
      {author: '0', content: prompt},
    ];

    const request: APIGenerateMessageRequest = {
      prompt: {
        messages,
      },
      model: this.model,
      temperature: options.temperature || this.temperature,
      topP: options.topP || this.topP,
      topK: options.topK || this.topK,
      candidateCount: options.candidateCount || this.candidateCount,
    };

    request.prompt!.context = options.context || this.context;
    request.prompt!.examples = this.messagesToExamples(
      options.examples || this.examples || []
    );

    return this.generateMessage(request);
  }

  private async generateMessage(
    request: APIGenerateMessageRequest
  ): Promise<GenerateMessageResponse> {
    const [result] = await this.client.generateMessage(request);
    if (!result.candidates || !result.candidates.length) {
      throw new Error('No candidates returned from server.');
    }

    const content = result.candidates[0].content;

    const candidates = result.candidates!.map(c => c.content!);

    if (!content) {
      throw new Error('No content returned from server.');
    }
    const messages = result.messages || [];

    return {
      response: content,
      candidates,
      history: this.messagesFromApi(messages),
    };
  }

  private messagesToApi(messages: Message[]): APIMessage[] {
    const out: APIMessage[] = [];
    for (const message of messages) {
      if (!message.prompt || !message.response) {
        logs.warnMissingPromptOrResponse(message.path!);
        continue;
      }
      out.push({author: '0', content: message.prompt});
      out.push({author: '1', content: message.response});
    }
    return out;
  }

  private messagesFromApi(messages: APIMessage[]): Message[] {
    const out = [];
    for (let i = 0; i < messages.length; i += 2) {
      out.push({
        prompt: messages[i].content || '',
        response: messages[i + 1]?.content || '',
      });
    }
    return out;
  }

  private messagesToExamples(messages: Message[]): APIExample[] {
    return messages.map(m => ({
      input: {author: '0', content: m.prompt!},
      output: {author: '1', content: m.response!},
    }));
  }
}
