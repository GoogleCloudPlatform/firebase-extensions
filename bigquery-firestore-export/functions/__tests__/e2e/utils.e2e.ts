/**
 * Copyright 2025 Google LLC
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

import {BigQuery} from '@google-cloud/bigquery';
import {DataTransferServiceClient} from '@google-cloud/bigquery-data-transfer';
import * as admin from 'firebase-admin';
import {PubSub} from '@google-cloud/pubsub';
import {e2eConfig, generateTestResourceNames} from './config.e2e';
import {Config} from '../../src/types';

// Initialize clients
let bigquery: BigQuery;
let dataTransferClient: DataTransferServiceClient;
let firestore: admin.firestore.Firestore;
let pubsub: PubSub;
let isInitialized = false;

/**
 * Initialize test clients and services
 */
export const initializeTestClients = async () => {
  if (isInitialized) return;

  bigquery = new BigQuery({
    projectId: e2eConfig.projectId,
  });

  dataTransferClient = new DataTransferServiceClient({
    projectId: e2eConfig.projectId,
  });

  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: e2eConfig.projectId,
    });
  }
  firestore = admin.firestore();

  pubsub = new PubSub({
    projectId: e2eConfig.projectId,
  });

  isInitialized = true;
};

/**
 * Create a BigQuery dataset for testing
 */
export const createTestDataset = async (datasetId: string): Promise<void> => {
  try {
    const [dataset] = await bigquery.createDataset(datasetId, {
      location: e2eConfig.bigqueryDatasetLocation,
    });
    console.log(`Created test dataset: ${dataset.id}`);
  } catch (error: any) {
    if (error.code !== 409) {
      // 409 = already exists
      throw error;
    }
    console.log(`Dataset ${datasetId} already exists`);
  }
};

/**
 * Create a BigQuery table for testing
 */
export const createTestTable = async (
  datasetId: string,
  tableName: string,
  schema: any[] = [
    {name: 'id', type: 'STRING', mode: 'REQUIRED'},
    {name: 'name', type: 'STRING', mode: 'NULLABLE'},
    {name: 'value', type: 'INTEGER', mode: 'NULLABLE'},
    {name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE'},
  ]
): Promise<void> => {
  const dataset = bigquery.dataset(datasetId);
  const [table] = await dataset.createTable(tableName, {
    schema,
    location: e2eConfig.bigqueryDatasetLocation,
  });
  console.log(`Created test table: ${table.id}`);
};

/**
 * Insert test data into a BigQuery table
 */
export const insertTestData = async (
  datasetId: string,
  tableName: string,
  rows: any[]
): Promise<void> => {
  const dataset = bigquery.dataset(datasetId);
  const table = dataset.table(tableName);
  await table.insert(rows);
  console.log(`Inserted ${rows.length} rows into ${datasetId}.${tableName}`);
};

/**
 * Delete a BigQuery dataset and all its tables
 */
export const deleteTestDataset = async (datasetId: string): Promise<void> => {
  try {
    const dataset = bigquery.dataset(datasetId);
    await dataset.delete({force: true});
    console.log(`Deleted test dataset: ${datasetId}`);
  } catch (error: any) {
    if (error.code !== 404) {
      // 404 = not found
      console.error(`Error deleting dataset ${datasetId}:`, error.message);
    }
  }
};

/**
 * Create a PubSub topic for testing
 */
export const createTestTopic = async (topicName: string): Promise<void> => {
  try {
    const [topic] = await pubsub.createTopic(topicName);
    console.log(`Created test topic: ${topic.name}`);
  } catch (error: any) {
    if (error.code !== 6) {
      // 6 = already exists
      throw error;
    }
    console.log(`Topic ${topicName} already exists`);
  }
};

/**
 * Delete a PubSub topic
 */
export const deleteTestTopic = async (topicName: string): Promise<void> => {
  try {
    const topic = pubsub.topic(topicName);
    await topic.delete();
    console.log(`Deleted test topic: ${topicName}`);
  } catch (error: any) {
    if (error.code !== 5) {
      // 5 = not found
      console.error(`Error deleting topic ${topicName}:`, error.message);
    }
  }
};

/**
 * Delete all documents in a Firestore collection
 */
export const deleteTestCollection = async (
  collectionPath: string
): Promise<void> => {
  const collectionRef = firestore.collection(collectionPath);
  const batch = firestore.batch();

  const snapshot = await collectionRef.get();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });

  if (!snapshot.empty) {
    await batch.commit();
    console.log(`Deleted ${snapshot.size} documents from ${collectionPath}`);
  }
};

/**
 * Create a transfer config for testing
 */
export const createTestTransferConfig = async (
  displayName: string,
  datasetId: string,
  tableName: string,
  queryString: string,
  schedule: string,
  topicName: string,
  partitioningField?: string
): Promise<any> => {
  const params: any = {
    query: queryString,
    destination_table_name_template: `${tableName}_{run_time|"%H%M%S"}`,
    write_disposition: 'WRITE_TRUNCATE',
  };

  if (partitioningField) {
    params.partitioning_field = partitioningField;
  }

  const transferConfigParams: any = {};
  for (const [key, value] of Object.entries(params)) {
    transferConfigParams[key] = {stringValue: value as string};
  }

  const transferConfig = {
    destinationDatasetId: datasetId,
    displayName,
    dataSourceId: 'scheduled_query',
    params: {fields: transferConfigParams},
    schedule,
    notificationPubsubTopic: `projects/${e2eConfig.projectId}/topics/${topicName}`,
  };

  const request = {
    parent: `projects/${e2eConfig.projectId}`,
    transferConfig,
  };

  const [response] = await dataTransferClient.createTransferConfig(request);
  console.log(`Created transfer config: ${response.name}`);
  return response;
};

/**
 * Update a transfer config for testing
 */
export const updateTestTransferConfig = async (
  transferConfigName: string,
  updates: {
    queryString?: string;
    schedule?: string;
    tableName?: string;
    partitioningField?: string | null;
  }
): Promise<any> => {
  // Get existing config
  const [existingConfig] = await dataTransferClient.getTransferConfig({
    name: transferConfigName,
  });

  const updateMask: string[] = [];
  const updatedConfig = JSON.parse(JSON.stringify(existingConfig));

  if (updates.queryString !== undefined) {
    updateMask.push('params');
    updatedConfig.params.fields.query.stringValue = updates.queryString;
  }

  if (updates.tableName !== undefined) {
    updateMask.push('params');
    updatedConfig.params.fields.destination_table_name_template.stringValue = `${updates.tableName}_{run_time|"%H%M%S"}`;
  }

  if (updates.partitioningField !== undefined) {
    if (
      updates.partitioningField !== null &&
      updates.partitioningField !== ''
    ) {
      updateMask.push('params');
      if (!updatedConfig.params.fields.partitioning_field) {
        updatedConfig.params.fields.partitioning_field = {};
      }
      updatedConfig.params.fields.partitioning_field.stringValue =
        updates.partitioningField;
    }
  }

  if (updates.schedule !== undefined) {
    updateMask.push('schedule');
    updatedConfig.schedule = updates.schedule;
  }

  const request = {
    transferConfig: updatedConfig,
    updateMask: {paths: updateMask},
  };

  const [response] = await dataTransferClient.updateTransferConfig(request);
  console.log(`Updated transfer config: ${response.name}`);
  return response;
};

/**
 * Delete a transfer config
 */
export const deleteTestTransferConfig = async (
  transferConfigName: string
): Promise<void> => {
  try {
    await dataTransferClient.deleteTransferConfig({
      name: transferConfigName,
    });
    console.log(`Deleted transfer config: ${transferConfigName}`);
  } catch (error: any) {
    if (error.code !== 5) {
      // 5 = not found
      console.error(
        `Error deleting transfer config ${transferConfigName}:`,
        error.message
      );
    }
  }
};

/**
 * Wait for a condition to be met with retries
 */
export const waitForCondition = async (
  condition: () => Promise<boolean>,
  timeoutMs = 30000,
  intervalMs = 1000
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await condition()) {
      return;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Condition not met within ${timeoutMs}ms timeout`);
};

/**
 * Sleep for a specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate test data rows
 */
export const generateTestRows = (count: number): any[] => {
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      id: `test-${i}`,
      name: `Test Item ${i}`,
      value: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
    });
  }
  return rows;
};

/**
 * Get transfer config from Firestore by extension instance ID
 */
export const getTransferConfigFromFirestore = async (
  collectionPath: string,
  instanceId: string
): Promise<any> => {
  const query = firestore
    .collection(collectionPath)
    .where('extInstanceId', '==', instanceId);

  const snapshot = await query.get();
  if (snapshot.empty) {
    return null;
  }

  return snapshot.docs[0].data();
};

/**
 * Verify transfer run results in Firestore
 */
export const verifyTransferRunInFirestore = async (
  collectionPath: string,
  transferConfigId: string,
  runId: string
): Promise<boolean> => {
  const runDoc = await firestore
    .collection(`${collectionPath}/${transferConfigId}/runs`)
    .doc(runId)
    .get();

  return runDoc.exists;
};

/**
 * Get latest transfer run from Firestore
 */
export const getLatestTransferRun = async (
  collectionPath: string,
  transferConfigId: string
): Promise<any> => {
  const latestDoc = await firestore
    .collection(`${collectionPath}/${transferConfigId}/runs`)
    .doc('latest')
    .get();

  if (!latestDoc.exists) {
    return null;
  }

  return latestDoc.data();
};

/**
 * Clean up all test resources
 */
export const cleanupTestResources = async (resourceNames: {
  datasetId?: string;
  topicName?: string;
  collectionPath?: string;
  transferConfigName?: string;
}): Promise<void> => {
  console.log('Cleaning up test resources...');

  if (resourceNames.transferConfigName) {
    await deleteTestTransferConfig(resourceNames.transferConfigName);
  }

  if (resourceNames.datasetId) {
    await deleteTestDataset(resourceNames.datasetId);
  }

  if (resourceNames.topicName) {
    await deleteTestTopic(resourceNames.topicName);
  }

  if (resourceNames.collectionPath) {
    await deleteTestCollection(resourceNames.collectionPath);
  }

  console.log('Test resources cleaned up');
};

/**
 * Create a Config object matching the extension's Config interface
 */
export const createMockConfig = (
  testResources: ReturnType<typeof generateTestResourceNames>,
  overrides: Partial<Config> = {}
): Config => {
  const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

  return {
    location: e2eConfig.location,
    bigqueryDatasetLocation: e2eConfig.bigqueryDatasetLocation,
    projectId: e2eConfig.projectId,
    instanceId: e2eConfig.testInstanceId,
    datasetId: testResources.datasetId,
    tableName: testResources.tableName,
    queryString,
    schedule: e2eConfig.testSchedule,
    pubSubTopic: testResources.topicName,
    firestoreCollection: testResources.collectionPath,
    displayName: testResources.transferConfigDisplayName,
    ...overrides,
  };
};

/**
 * Verify update mask contains expected fields
 */
export const verifyUpdateMask = (
  updateRequest: any,
  expectedPaths: string[]
): void => {
  const actualPaths = updateRequest.updateMask?.paths || [];
  expect(actualPaths.sort()).toEqual(expectedPaths.sort());
};
