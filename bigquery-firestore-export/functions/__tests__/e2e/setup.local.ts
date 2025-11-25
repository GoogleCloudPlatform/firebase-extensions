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

import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Setup for running E2E tests locally
 */

// Load local environment variables
dotenv.config({path: path.join(__dirname, '.env.e2e.test')});

// Set default test timeout for local testing
jest.setTimeout(120000); // 2 minutes

// Log test environment
console.log('Running E2E tests in LOCAL environment');
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
    )}. Please create __tests__/e2e/.env.e2e.test based on .env.e2e.test.example`
  );
  console.error(error.message);
  throw error;
}

// Set Google Application Default Credentials if provided
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.log(
    `Using service account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`
  );
} else {
  console.log('Using Application Default Credentials');
}

// Export setup complete flag
export const setupComplete = true;
