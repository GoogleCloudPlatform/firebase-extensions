/**
 * Copyright 2026 Google LLC
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

/** A response part as far as candidate parsing is concerned. */
export interface TextPart {
  text?: string;
  thought?: boolean;
}

/** The non-thought text parts of a candidate, joined. */
export function answerText(parts?: TextPart[]): string | undefined {
  const text = (parts ?? [])
    .filter(part => !part.thought && typeof part.text === 'string')
    .map(part => part.text)
    .join('');
  return text || undefined;
}

const BLOCKED_FINISH_REASONS = ['SAFETY', 'RECITATION'];

/** Whether a candidate was cut off in a way that makes its text unusable. */
export function wasBlocked(candidate?: {finishReason?: string}): boolean {
  return BLOCKED_FINISH_REASONS.includes(candidate?.finishReason ?? '');
}

/** The response fields that explain a missing answer. */
export interface BlockedResponse {
  promptFeedback?: {blockReason?: string; blockReasonMessage?: string};
  candidates?: {finishReason?: string; finishMessage?: string}[];
}

/** Why a response carried no answer text. */
export function noAnswerMessage(response: BlockedResponse): string {
  const {blockReason, blockReasonMessage} = response.promptFeedback ?? {};
  if (blockReason) {
    return `Prompt was blocked due to ${blockReason}${
      blockReasonMessage ? `: ${blockReasonMessage}` : ''
    }`;
  }
  const {finishReason, finishMessage} = response.candidates?.[0] ?? {};
  if (finishReason && finishReason !== 'STOP') {
    return `No answer text returned, candidate finished due to ${finishReason}${
      finishMessage ? `: ${finishMessage}` : ''
    }`;
  }
  return 'No answer text returned';
}
