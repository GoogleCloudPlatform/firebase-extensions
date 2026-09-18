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

import {wantsMultipleCandidates} from '../../src/candidates';
import {
  answerText,
  noAnswerMessage,
  wasBlocked,
} from '../../src/generative-client/parts';

describe('wantsMultipleCandidates', () => {
  it('is true for a count above one with a field to write to', () => {
    expect(
      wantsMultipleCandidates({
        candidateCount: 2,
        candidatesField: 'candidates',
      })
    ).toBe(true);
  });

  it('is false for a single candidate', () => {
    expect(
      wantsMultipleCandidates({
        candidateCount: 1,
        candidatesField: 'candidates',
      })
    ).toBe(false);
  });

  it('is false without a candidates field, so the request is not wasted', () => {
    expect(wantsMultipleCandidates({candidateCount: 2})).toBe(false);
  });

  it('is false for an unset count', () => {
    expect(wantsMultipleCandidates({candidatesField: 'candidates'})).toBe(
      false
    );
  });
});

describe('answerText', () => {
  it('returns the only text part', () => {
    expect(answerText([{text: 'answer'}])).toBe('answer');
  });

  it('joins several text parts', () => {
    expect(answerText([{text: 'Hi.'}, {text: ' Hi'}])).toBe('Hi. Hi');
  });

  it('skips a leading thought part', () => {
    expect(
      answerText([{text: 'thinking out loud', thought: true}, {text: 'answer'}])
    ).toBe('answer');
  });

  it('returns undefined when every part is a thought', () => {
    expect(answerText([{text: 'thinking', thought: true}])).toBeUndefined();
  });

  it('returns undefined for missing or empty parts', () => {
    expect(answerText(undefined)).toBeUndefined();
    expect(answerText([])).toBeUndefined();
    expect(answerText([{}])).toBeUndefined();
  });
});

describe('noAnswerMessage', () => {
  it('names the prompt block reason', () => {
    expect(
      noAnswerMessage({
        promptFeedback: {blockReason: 'SAFETY', blockReasonMessage: 'nope'},
      })
    ).toBe('Prompt was blocked due to SAFETY: nope');
  });

  it('names the first candidate finish reason', () => {
    expect(
      noAnswerMessage({
        candidates: [{finishReason: 'RECITATION'}],
      })
    ).toBe('No answer text returned, candidate finished due to RECITATION');
  });

  it('prefers the prompt block reason over the finish reason', () => {
    expect(
      noAnswerMessage({
        promptFeedback: {blockReason: 'OTHER'},
        candidates: [{finishReason: 'SAFETY'}],
      })
    ).toBe('Prompt was blocked due to OTHER');
  });

  it('treats a normal stop with no text as unexplained', () => {
    expect(noAnswerMessage({candidates: [{finishReason: 'STOP'}]})).toBe(
      'No answer text returned'
    );
    expect(noAnswerMessage({})).toBe('No answer text returned');
  });
});

describe('wasBlocked', () => {
  it('is true for a safety or recitation finish', () => {
    expect(wasBlocked({finishReason: 'SAFETY'})).toBe(true);
    expect(wasBlocked({finishReason: 'RECITATION'})).toBe(true);
  });

  it('is false for a normal stop, a token limit, or no candidate', () => {
    expect(wasBlocked({finishReason: 'STOP'})).toBe(false);
    expect(wasBlocked({finishReason: 'MAX_TOKENS'})).toBe(false);
    expect(wasBlocked({})).toBe(false);
    expect(wasBlocked(undefined)).toBe(false);
  });
});
