/**
 * Copyright 2019 Google LLC
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

import {Config} from './types';

const config: Config = {
  location: process.env.LOCATION!,
  bigqueryDatasetLocation: process.env.BIGQUERY_DATASET_LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,
  transferConfigName: undefined,
  datasetId: process.env.DATASET_ID,
  tableName: process.env.TABLE_NAME,
  queryString: process.env.QUERY_STRING,
  displayName: process.env.DISPLAY_NAME,
  partitioningField: process.env.PARTITIONING_FIELD,
  schedule: process.env.SCHEDULE,
  pubSubTopic: `ext-${process.env.EXT_INSTANCE_ID}-processMessages`,
  firestoreCollection: process.env.COLLECTION_PATH!,
};

export default config;
