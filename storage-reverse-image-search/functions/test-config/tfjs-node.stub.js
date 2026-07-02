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

// Stub for @tensorflow/tfjs-node, wired in only by jest.config.js via
// moduleNameMapper. The real package loads a native addon (tfjs_binding.node)
// at require time, which is absent in CI (dependencies installed with
// --ignore-scripts). This caused every unit suite transitively importing
// feature_vectors.ts to fail to run.
//
// This file deliberately lives outside a __mocks__ directory: manual mocks for
// node_modules packages are applied automatically by jest and cannot be opted
// out per-config, which would also break the integration run. Wiring it through
// moduleNameMapper keeps it scoped to the unit config, so
// jest.integration.config.js uses the real package.
module.exports = {};
