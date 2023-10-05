const projectId = process.env.PROJECT_ID!;
const bucketName = process.env.BUCKET_NAME || `${projectId}.appspot.com`;
const instanceId = process.env.EXT_INSTANCE_ID!;
const location = process.env.LOCATION!;

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
  restoreDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/restore`,
  cloudBuildDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/cloudBuild`,
  syncCollectionPath: process.env.SYNC_COLLECTION_PATH!,

  bqDataset: process.env.SYNC_DATASET!,
  bqtable: process.env.SYNC_TABLE!,

  backupInstanceName: process.env.BACKUP_INSTANCE_ID!,

  stagingLocation: `gs://${bucketName}/${instanceId}/staging`,
  templateLocation: `gs://${bucketName}/${instanceId}/templates/myTemplate`,
  dataflowRegion:
    process.env.DATAFLOW_REGION || process.env.LOCATION || 'us-central1',
};
