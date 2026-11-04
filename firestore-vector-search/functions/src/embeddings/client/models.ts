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

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const MULTIMODAL_EMBEDDING_MODEL = 'multimodalembedding@001';
export const OPENAI_EMBEDDING_MODEL = 'text-embedding-ada-002';

export const getEmbeddingModel = (
  provider: string,
  customEndpoint?: string
) => {
  switch (provider) {
    case 'gemini':
    case 'vertex':
      return GEMINI_EMBEDDING_MODEL;
    case 'multimodal':
      return MULTIMODAL_EMBEDDING_MODEL;
    case 'openai':
      return OPENAI_EMBEDDING_MODEL;
    case 'custom':
      return customEndpoint || 'custom';
    default:
      return provider;
  }
};
