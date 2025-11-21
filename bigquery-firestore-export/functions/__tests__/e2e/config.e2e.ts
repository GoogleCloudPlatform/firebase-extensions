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

// Load E2E test environment variables
dotenv.config({path: path.join(__dirname, '.env.e2e.test')});

/**
 * E2E test configuration for BigQuery-Firestore export extension
 */
export const e2eConfig = {
  // Project configuration
  projectId: process.env.E2E_PROJECT_ID || '',
  location: process.env.E2E_LOCATION || 'us-central1',
  bigqueryDatasetLocation: process.env.E2E_BIGQUERY_DATASET_LOCATION || 'US',

  // BigQuery configuration
  testDatasetPrefix: 'e2e_test_',
  testTablePrefix: 'test_table_',

  // Firestore configuration
  testCollectionPrefix: 'e2e_test_transfers_',

  // PubSub configuration
  testTopicPrefix: 'e2e-test-topic-',

  // Test data configuration
  testQueryTemplate: 'SELECT * FROM `{projectId}.{datasetId}.{tableName}`',
  testSchedule: 'every 15 minutes',

  // Timeouts (in milliseconds)
  bigqueryTimeout: 60000, // 60 seconds for BigQuery operations
  transferConfigTimeout: 30000, // 30 seconds for transfer config operations
  firestoreTimeout: 10000, // 10 seconds for Firestore operations
  pubsubTimeout: 20000, // 20 seconds for PubSub operations

  // Retry configuration
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds between retries

  // Test extension instance ID
  testInstanceId: `e2e-test-${Date.now()}`,
};

/**
 * Generates unique test resource names to avoid conflicts
 */
export const generateTestResourceNames = (testId: string) => {
  const timestamp = Date.now();
  const sanitizedTestId = testId.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);

  return {
    datasetId: `${e2eConfig.testDatasetPrefix}${sanitizedTestId}_${timestamp}`,
    tableName: `${e2eConfig.testTablePrefix}${sanitizedTestId}_${timestamp}`,
    collectionPath: `${e2eConfig.testCollectionPrefix}${sanitizedTestId}_${timestamp}`,
    topicName: `${e2eConfig.testTopicPrefix}${sanitizedTestId}-${timestamp}`,
    transferConfigDisplayName: `E2E Test ${sanitizedTestId} ${timestamp}`,
  };
};

/**
 * Validates that all required environment variables are set
 */
export const validateE2EConfig = () => {
  const requiredVars = [
    'E2E_PROJECT_ID',
    'E2E_LOCATION',
    'E2E_BIGQUERY_DATASET_LOCATION',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required E2E test environment variables: ${missingVars.join(
        ', '
      )}. ` +
        'Please create __tests__/e2e/.env.e2e.test with the required variables.'
    );
  }

  // Validate project ID format
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(e2eConfig.projectId)) {
    throw new Error(`Invalid project ID format: ${e2eConfig.projectId}`);
  }
};
