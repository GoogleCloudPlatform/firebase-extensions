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

export default {
  vertex: {
    model: 'gemini-1.0-pro',
  },
  googleAi: {
    model: 'gemini-1.0-pro',
    apiKey: 'test-api-key',
  },
  model: 'gemini-1.0-pro',
  location: 'europe-west1',
  projectId: 'text-project-id',
  instanceId: 'text-instance-id',
  collectionName: 'discussions',
  prompt: 'test prompt',
  responseField: 'output',
  provider: 'vertex-ai',
  vertexAiLocation: 'us-central1',
  apiKey: process.env.API_KEY,
  bucketName: 'demo-gcp.appspot.com',
  imageField: 'image',
  candidates: {
    field: 'candidates',
    count: 5,
    shouldIncludeCandidatesField: true,
  },
};
