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

export const getTransferConfigResponse = [
  {
    name: 'projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6',
    destinationDatasetId: 'destination_dataset_id',
    displayName: 'Transactions Rollup',
    dataSourceId: 'scheduled_query',
    params: {
      fields: {
        query: {
          stringValue:
            'Select * from `test-project.transaction_data.transactions`',
        },
        destination_table_name_template: {
          stringValue: 'transactions_{run_time|"%H%M%S"}',
        },
        write_disposition: {stringValue: 'WRITE_TRUNCATE'},
        partitioning_field: {stringValue: ''},
      },
    },
    schedule: 'every 15 minutes',
    notificationPubsubTopic: 'projects/test/topics/transfer_runs',
  },
];
