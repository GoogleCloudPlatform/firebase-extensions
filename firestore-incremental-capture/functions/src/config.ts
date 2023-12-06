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

const projectId = process.env.PROJECT_ID!;
const bucketName = process.env.BUCKET_NAME || `${projectId}.appspot.com`;
const instanceId = process.env.EXT_INSTANCE_ID!;
const location = process.env.LOCATION!;
const backupInstance = process.env.BACKUP_INSTANCE_ID!;
const backupInstanceFullId = `projects/${projectId}/databases/${backupInstance}`;

export default {
  projectId,
  instanceId,
  bucketName,
  location,
  bucketPath: 'backups',
  datasetLocation: 'us',
  runInitialBackup: true,

  instanceCollection: `_ext-${process.env.EXT_INSTANCE_ID!}`,
  statusDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/status`,
  backupDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/backups`,
  restoreDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/restore/jobs`,
  cloudBuildDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/cloudBuild`,
  syncCollectionPath: process.env.SYNC_COLLECTION_PATH!,

  bqDataset: process.env.SYNC_DATASET!,
  bqtable: process.env.SYNC_TABLE!,

  backupInstanceName: backupInstanceFullId,

  stagingLocation: `gs://${bucketName}/${instanceId}/staging`,
  templateLocation: `gs://${bucketName}/${instanceId}/templates/myTemplate`,
  dataflowRegion:
    process.env.DATAFLOW_REGION || process.env.LOCATION || 'us-central1',
};
