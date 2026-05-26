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

/**
 * Setup for running E2E tests in CI environment
 */

// Set default test timeout for CI
jest.setTimeout(180000); // 3 minutes (longer for CI)

// Log test environment
console.log('Running E2E tests in CI environment');
console.log(`Project ID: ${process.env.E2E_PROJECT_ID}`);
console.log(`Location: ${process.env.E2E_LOCATION}`);
console.log(
  `BigQuery Dataset Location: ${process.env.E2E_BIGQUERY_DATASET_LOCATION}`
);

// Validate required environment variables
const requiredVars = [
  'E2E_PROJECT_ID',
  'E2E_LOCATION',
  'E2E_BIGQUERY_DATASET_LOCATION',
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  const error = new Error(
    `Missing required environment variables: ${missingVars.join(
      ', '
    )}. Please set the required environment variables in your CI configuration`
  );
  console.error(error.message);
  throw error;
}

// CI-specific configurations
process.env.E2E_RUN_CLEANUP = 'true'; // Always cleanup in CI
process.env.NODE_ENV = 'test';

// Set Google Application Default Credentials
// In CI, this should be set via GitHub Secrets or similar
if (
  !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
  !process.env.GOOGLE_CLOUD_KEYFILE_JSON
) {
  console.warn('No service account credentials found.');
  console.warn('CI tests may fail without proper authentication.');
}

// Export setup complete flag
export const setupComplete = true;
