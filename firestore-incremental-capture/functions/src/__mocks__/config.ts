export default {
  projectId: 'demo-test',
  instanceId: 'test-database',
  bucketName: 'test-bucket',
  location: 'us-central1',
  bucketPath: 'backups',
  datasetLocation: 'us',
  runInitialBackup: true,
  instanceCollection: '_ext-test-instance',
  statusDoc: '_ext-test-instance/status',
  backupDoc: '_ext-test-instance/backups',
  restoreDoc: '_ext-test-instance/restore/jobs',
  cloudBuildDoc: '_ext-test-instance/cloudBuild',
  syncCollectionPath: 'test-collection',
  bqDataset: 'test-dataset',
  bqtable: 'test-table',
  backupInstanceName: 'projects/demo-test/databases/test-backup-instance',
  stagingLocation: 'gs://test-bucket/test-database/staging',
  templateLocation: 'gs://test-bucket/test-database/templates/myTemplate',
  dataflowRegion: 'us-central1',
};
