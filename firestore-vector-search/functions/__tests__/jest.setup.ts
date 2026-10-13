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

// Mock firebase-functions
jest.mock('firebase-functions/v1', () => ({
  ...jest.requireActual('firebase-functions/v1'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock embeddings client
jest.mock('../src/embeddings/client', () => ({
  embeddingClient: {
    initialize: jest.fn(),
    getSingleEmbedding: jest.fn(),
  },
}));

// Mock vector store client
jest.mock('../src/vector-store', () => ({
  textVectorStoreClient: {
    query: jest.fn(),
  },
}));

// Mock config
jest.mock('../src/config', () => ({
  config: {
    defaultQueryLimit: 10,
    collectionName: 'test-collection',
    outputField: 'content',
    geminiApiKey: 'test-api-key',
    location: 'us-central1',
  },
  firestoreAdminClient: {
    listIndexes: jest.fn(),
    createIndex: jest.fn(),
    getIndex: jest.fn(),
  },
}));
