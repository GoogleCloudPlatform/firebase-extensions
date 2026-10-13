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

import {vertexApiEndpoint} from '../../src/generative-client/vertex_endpoint';

describe('vertexApiEndpoint', () => {
  it('uses the unprefixed host for global', () => {
    expect(vertexApiEndpoint('global')).toBe('aiplatform.googleapis.com');
  });

  it('uses the regional endpoint host for a multi-region', () => {
    expect(vertexApiEndpoint('us')).toBe('aiplatform.us.rep.googleapis.com');
    expect(vertexApiEndpoint('eu')).toBe('aiplatform.eu.rep.googleapis.com');
  });

  it('keeps the SDK default for a single region', () => {
    expect(vertexApiEndpoint('us-central1')).toBeUndefined();
    expect(vertexApiEndpoint(undefined)).toBeUndefined();
  });
});
