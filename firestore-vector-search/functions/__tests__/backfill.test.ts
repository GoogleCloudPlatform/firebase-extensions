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

import {embeddingMetadataChanged} from '../src/backfill';

const current = {
  embeddingProvider: 'vertex',
  embeddingModel: 'gemini-embedding-001',
  dimension: 768,
  inputField: 'content',
  outputField: 'embedding',
};

describe('embeddingMetadataChanged', () => {
  test('keeps matching embedding metadata', () => {
    expect(embeddingMetadataChanged(current, current)).toBe(false);
  });

  test('requires a backfill when the embedding model changes', () => {
    expect(
      embeddingMetadataChanged(
        {...current, embeddingModel: 'text-embedding-004'},
        current
      )
    ).toBe(true);
  });
});
