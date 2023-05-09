export const mockedConfig = {
  location: 'us-central1',
  bigqueryDatasetLocation: null,
  projectId: 'dev-extensions-testing',
  instanceId: 'test-instance-id',
  transferConfigName: null,
  datasetId: 'scheduled_writes',
  tableName: 'scheduled_writes',
  queryString: null,
  displayName: null,
  partitioningField: null,
  schedule: null,
  pubSubTopic: 'firestore-bigquery-scheduler',
  firestoreCollection: 'dev-extensions-testing',
};

export const mockConfig = {
  ...mockedConfig,
};

export function updateConfig(config, newConfig) {
  Object.assign(config, newConfig);
}
