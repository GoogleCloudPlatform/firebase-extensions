const projectId = process.env.PROJECT_ID!;
const bucketName = process.env.BUCKET_NAME || `${projectId}.appspot.com`;
const instanceId = process.env.EXT_INSTANCE_ID!;

export default {
  projectId,
  instanceId,
  instanceCollection: `_ext-${process.env.EXT_INSTANCE_ID!}`,
  statusDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/status`,
  backupDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/backups`,
  restoreDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/restore`,
  bucketName: process.env.BUCKET_NAME || bucketName,
  bucketPath: 'backups',
  bqDataset: process.env.SYNC_DATASET!,
  bqtable: process.env.SYNC_TABLE!,
  datasetLocation: 'us',
  backupInstanceName: process.env.BACKUP_INSTANCE_ID!,
  runInitialBackup: true,
  syncCollectionPath: process.env.SYNC_COLLECTION_PATH!,
  cloudBuildDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/cloudBuild`,
  location: process.env.LOCATION!,
  stagingLocation: `gs://${bucketName}/${instanceId}/staging`,
  templateLocation: `gs://${bucketName}/${instanceId}/templates/myTemplate`,
  dataflowRegion:
    process.env.DATAFLOW_REGION || process.env.LOCATION || 'us-central1',
};
