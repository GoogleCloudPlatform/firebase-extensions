/**
 * Copyright 2023 Google LLC
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

// Stub for the Universal Sentence Encoder model. It transitively depends on the
// native @tensorflow/tfjs-node addon, so it is mocked for unit tests. load()
// returns a model whose embed() yields a deterministic zero vector; tests that
// assert on real embedding values are integration tests and remain skipped.
const DIMENSIONS = 512;

async function load() {
  return {
    embed: async input => {
      const rows = Array.isArray(input) ? input.length : 1;
      const vectors = Array.from({length: rows}, () =>
        new Array(DIMENSIONS).fill(0)
      );
      return {
        arraySync: () => vectors,
      };
    },
  };
}

module.exports = {load};
