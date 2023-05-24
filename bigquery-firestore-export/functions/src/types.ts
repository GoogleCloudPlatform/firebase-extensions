export interface Config {
  location: string;
  bigqueryDatasetLocation: string;
  projectId: string;
  instanceId: string;
  transferConfigName?: string;
  datasetId?: string;
  tableName?: string;
  queryString?: string;
  partitioningField?: string;
  schedule?: string;
  pubSubTopic: string;
  firestoreCollection: string;
  displayName?: string;
}
