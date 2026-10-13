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

module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/functions/cleanup.ts'],
  moduleNameMapper: {
    // Redirect the TensorFlow packages to lightweight stubs. The real
    // @tensorflow/tfjs-node loads a native addon at require time that is absent
    // in CI (deps installed with --ignore-scripts), which caused unrelated
    // suites to fail to run. See __mocks__/@tensorflow/.
    '^@tensorflow/tfjs-node$': '<rootDir>/__mocks__/@tensorflow/tfjs-node.js',
    '^@tensorflow-models/universal-sentence-encoder$':
      '<rootDir>/__mocks__/@tensorflow-models/universal-sentence-encoder.js',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
};
