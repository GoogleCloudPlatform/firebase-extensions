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

export const environment = {
  PROJECT_ID: 'demo-test',
  LOCATION: 'us-central1',
  BIGQUERY_DATASET_LOCATION: 'us',
  TRANSFER_CONFIG_NAME:
    'projects/11111111111111/locations/us/transferConfigs/645c0eb8-0000-27be-9ba1-94eb2c1cfc8a',
  DISPLAY_NAME: 'Transactions Rollup',
  DATASET_ID: 'transactions_data',
  TABLE_NAME: 'transactions',
  QUERY_STRING: 'Select * from `test-project.transaction_data.transactions`',
  PARTITIONING_FIELD: '',
  SCHEDULE: 'every 15 minutes',
  PUB_SUB_TOPIC: 'transfer_runs',
  FIRESTORE_COLLECTION: 'transferConfigs',
  EXT_INSTANCE_ID: 'firestore-bigquery-scheduler',
};
