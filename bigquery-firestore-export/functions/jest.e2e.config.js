/**
 * Copyright 2025 Google LLC
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
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__/e2e'],
  testMatch: ['**/*.e2e.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  // Handle dynamic imports in Google Cloud libraries
  transformIgnorePatterns: [
    'node_modules/(?!(@google-cloud|google-gax|google-auth-library)/)',
  ],
  // E2E tests need longer timeouts for BigQuery operations
  testTimeout: 120000, // 2 minutes default timeout
  // Setup and teardown
  globalSetup: undefined, // Can be set to a setup script if needed
  globalTeardown: undefined, // Can be set to a teardown script if needed
  // Coverage settings (optional for E2E tests)
  collectCoverage: false,
  coverageDirectory: '<rootDir>/coverage-e2e',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/*.test.ts'],
  // Verbose output for debugging
  verbose: true,
  // Run tests sequentially to avoid conflicts
  maxWorkers: 1,
  // Clear mocks between tests
  clearMocks: true,
  // Additional test environment variables can be set here
  testEnvironmentOptions: {
    // Any environment-specific options
  },
};
