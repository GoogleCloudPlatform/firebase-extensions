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

// Stub for the @tensorflow/tfjs-node native module. The real package loads a
// platform-specific native addon (tfjs_binding.node) at require time, which is
// not available in CI where dependencies are installed with --ignore-scripts.
// Unit tests never exercise the model itself, so an empty stub is sufficient;
// tests that need real embeddings are integration tests and remain skipped.
module.exports = {};
