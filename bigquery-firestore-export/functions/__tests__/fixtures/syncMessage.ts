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

export const syncMessage = (name: string) => {
  return {
    failedRowCount: 0,
    totalRowCount: 1,
    runMetadata: {
      scheduleTime: '2023-03-23T21:03:00Z',
      destinationDatasetId: 'test',
      emailPreferences: {},
      updateTime: '2023-03-23T21:04:16.167248Z',
      params: {
        destination_table_name_template: 'test_{run_time|"%H%M%S"}',
        query: 'SELECT * FROM `jeff-glm-testing.test.test`',
        write_disposition: 'WRITE_TRUNCATE',
        partitioning_field: '',
      },
      userId: '-1291228896441774269',
      schedule: 'every 15 minutes',
      dataSourceId: 'scheduled_query',
      name,
      errorStatus: {},
      startTime: '2023-03-23T21:03:01.133872Z',
      endTime: '2023-03-23T21:04:16.167236Z',
      runTime: '2023-03-23T21:03:00Z',
      state: 'SUCCEEDED',
      notificationPubsubTopic: 'projects/jeff-glm-testing/topics/test',
    },
  };
};
