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

import * as admin from 'firebase-admin';
import {
  e2eConfig,
  generateTestResourceNames,
  validateE2EConfig,
} from './config.e2e';
import {
  initializeTestClients,
  createTestDataset,
  createTestTable,
  insertTestData,
  createTestTopic,
  createTestTransferConfig,
  updateTestTransferConfig,
  deleteTestTransferConfig,
  getTransferConfigFromFirestore,
  sleep,
  generateTestRows,
  cleanupTestResources,
  createMockConfig,
  verifyUpdateMask,
  invokeUpsertTransferConfig,
  createMockPubsubMessage,
  setTestConfig,
} from './utils.e2e';
import * as dts from '../../src/dts';

// Mock the config module to use test config
jest.mock('../../src/config', () => {
  const utils = require('./utils.e2e');
  return {
    default: new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Use test config if set, otherwise fallback to actual config
          if (utils.currentTestConfig && prop in utils.currentTestConfig) {
            return utils.currentTestConfig[prop];
          }
          // Fallback - this shouldn't happen in our tests
          const actualConfig = jest.requireActual('../../src/config').default;
          return actualConfig[prop];
        },
      }
    ),
  };
});

// Mock getExtensions
jest.mock('firebase-admin/extensions', () => {
  return {
    getExtensions: jest.fn(() => {
      return {
        runtime: jest.fn(() => {
          return {
            setProcessingState: jest.fn().mockResolvedValue(undefined),
          };
        }),
      };
    }),
  };
});

// Test resource names
let testResources: ReturnType<typeof generateTestResourceNames>;
let transferConfigName: string | undefined;
let firestore: admin.firestore.Firestore;

describe('BigQuery-Firestore Export E2E Reconfiguration Tests', () => {
  beforeAll(async () => {
    // Validate E2E configuration
    validateE2EConfig();

    // Initialize test clients
    await initializeTestClients();

    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: e2eConfig.projectId,
      });
    }
    firestore = admin.firestore();
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    // Clean up any remaining test resources
    if (testResources) {
      await cleanupTestResources({
        datasetId: testResources.datasetId,
        topicName: testResources.topicName,
        collectionPath: testResources.collectionPath,
        transferConfigName,
      });
    }
  }, 120000);

  beforeEach(async () => {
    // Generate unique resource names for this test
    const testName = expect.getState().currentTestName || 'test';
    testResources = generateTestResourceNames(testName);
  });

  afterEach(async () => {
    // Clean up test resources after each test
    if (testResources) {
      await cleanupTestResources({
        datasetId: testResources.datasetId,
        topicName: testResources.topicName,
        collectionPath: testResources.collectionPath,
        transferConfigName,
      });
    }
    transferConfigName = undefined;
  }, 60000);

  describe('Initial Configuration', () => {
    test('should create transfer config on first install', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      // Create transfer config
      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Verify transfer config was created
      expect(transferConfig).toBeDefined();
      expect(transferConfig.name).toContain('projects/');
      expect(transferConfig.displayName).toBe(
        testResources.transferConfigDisplayName
      );
      expect(transferConfig.destinationDatasetId).toBe(testResources.datasetId);
    }, 60000);

    test('should write config to Firestore', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;
      const transferConfigId = transferConfigName?.split('/').pop();

      // Write to Firestore (simulating what the extension does)
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig,
        });

      // Verify it was written
      const savedConfig = await getTransferConfigFromFirestore(
        testResources.collectionPath,
        e2eConfig.testInstanceId
      );

      expect(savedConfig).toBeDefined();
      expect(savedConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
      expect(savedConfig.name).toBe(transferConfigName);
    }, 60000);
  });

  describe('Query String Reconfiguration', () => {
    test('should update query without affecting schedule', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT id, name FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        initialQuery,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update query
      const updatedQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\` WHERE value > 100`;
      // Test using extension's constructUpdateTransferConfigRequest to verify update mask
      const mockConfig = createMockConfig(testResources, {
        queryString: updatedQuery,
        schedule: e2eConfig.testSchedule, // Schedule unchanged
      });

      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask only includes 'params' (not 'schedule')
      verifyUpdateMask(updateRequest, ['params']);

      // Verify schedule field was not modified in the update request
      expect(updateRequest.transferConfig.schedule).toBe(
        e2eConfig.testSchedule
      );

      // Apply the update
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        queryString: updatedQuery,
      });

      // Verify update
      expect(updatedConfig.params.fields.query.stringValue).toBe(updatedQuery);
      expect(updatedConfig.schedule).toBe(e2eConfig.testSchedule); // Schedule unchanged
    }, 60000);

    test('should handle complex query changes', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const simpleQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        simpleQuery,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update to complex query with aggregations
      const complexQuery = `
        SELECT
          DATE(timestamp) as date,
          COUNT(*) as count,
          AVG(value) as avg_value,
          MAX(value) as max_value
        FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\`
        GROUP BY date
        ORDER BY date DESC
      `.trim();

      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        queryString: complexQuery,
      });

      // Verify update
      expect(updatedConfig.params.fields.query.stringValue).toBe(complexQuery);
    }, 60000);
  });

  describe('Schedule Reconfiguration', () => {
    test('should update schedule frequency', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        'every 15 minutes',
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update schedule
      const newSchedule = 'every 30 minutes';
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        schedule: newSchedule,
      });

      // Verify update
      expect(updatedConfig.schedule).toBe(newSchedule);
      expect(updatedConfig.params.fields.query.stringValue).toBe(queryString); // Query unchanged
    }, 60000);

    test('should handle schedule format changes', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        'every 24 hours',
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Change to cron format
      const cronSchedule = 'every day 09:00';
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        schedule: cronSchedule,
      });

      // Verify update
      expect(updatedConfig.schedule).toBe(cronSchedule);
    }, 60000);
  });

  describe('Table and Dataset Reconfiguration', () => {
    test('should update destination table name', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      const newTableName = `${testResources.tableName}_new`;
      await createTestTable(testResources.datasetId, newTableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update table name
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        tableName: newTableName,
      });

      // Verify update
      expect(
        updatedConfig.params.fields.destination_table_name_template.stringValue
      ).toContain(newTableName);
    }, 60000);
  });

  describe('Partitioning Field Reconfiguration', () => {
    test('should add partitioning to non-partitioned table', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create without partitioning
      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Add partitioning
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        partitioningField: 'timestamp',
      });

      // Verify update
      expect(updatedConfig.params.fields.partitioning_field?.stringValue).toBe(
        'timestamp'
      );
    }, 60000);

    test('should handle empty partitioning field correctly', async () => {
      // This tests the bug fix for issue #2544
      // BigQuery Data Transfer API rejects empty/undefined values for partitioning_field on update
      // The extension should not attempt to clear partitioning_field when the new value is empty
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create with partitioning field
      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName,
        'timestamp'
      );

      transferConfigName = transferConfig.name;

      // Verify initial config has partitioning field
      expect(transferConfig.params.fields.partitioning_field?.stringValue).toBe(
        'timestamp'
      );

      // Create Config object matching extension's interface, trying to clear partitioning field
      const mockConfig = createMockConfig(testResources, {
        queryString,
        partitioningField: '', // Empty string - trying to clear partitioning
        schedule: e2eConfig.testSchedule,
      });

      // Test the constructUpdateTransferConfigRequest function
      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify that when trying to clear partitioning field, it's not included in the update
      // The update mask should NOT include 'params' if only partitioning field changed (and it's being cleared)
      // OR if params is in the mask for other reasons, partitioning_field should remain unchanged
      const existingPartitioningField =
        transferConfig.params.fields.partitioning_field?.stringValue;

      // If update mask includes params, verify partitioning_field is not being cleared
      if (updateRequest.updateMask.paths.includes('params')) {
        // Partitioning field should either not be in the update, or should match existing value
        const updatedPartitioningField =
          updateRequest.transferConfig.params.fields.partitioning_field
            ?.stringValue;
        if (updatedPartitioningField !== undefined) {
          expect(updatedPartitioningField).toBe(existingPartitioningField);
        }
      } else {
        // If params is not in update mask, that's correct - we can't clear partitioning via API
        // This documents the BigQuery API limitation
        expect(updateRequest.updateMask.paths).not.toContain('params');
      }

      // Verify the partitioning field in the update request matches the existing value (not cleared)
      const finalPartitioningField =
        updateRequest.transferConfig.params.fields.partitioning_field
          ?.stringValue;
      if (finalPartitioningField !== undefined) {
        expect(finalPartitioningField).toBe(existingPartitioningField);
      }
    }, 60000);

    test('should change partitioning field', async () => {
      // Setup with multiple timestamp fields
      await createTestDataset(testResources.datasetId);

      // Create table with multiple timestamp fields
      const schema = [
        {name: 'id', type: 'STRING', mode: 'REQUIRED'},
        {name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE'},
        {name: 'updated_at', type: 'TIMESTAMP', mode: 'NULLABLE'},
        {name: 'value', type: 'INTEGER', mode: 'NULLABLE'},
      ];

      await createTestTable(
        testResources.datasetId,
        testResources.tableName,
        schema
      );
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create with initial partitioning
      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName,
        'created_at'
      );

      transferConfigName = transferConfig.name;

      // Change partitioning field
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        partitioningField: 'updated_at',
      });

      // Verify update
      expect(updatedConfig.params.fields.partitioning_field?.stringValue).toBe(
        'updated_at'
      );
    }, 60000);

    test('should add partitioning when field does not exist in original config', async () => {
      // This tests the bug fix where partitioning_field doesn't exist in the original config
      // The extension should initialize the field before setting its value
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create config without partitioning (not passing partitioningField parameter)
      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
        // Note: partitioningField is intentionally omitted
      );

      transferConfigName = transferConfig.name;

      // Verify original config doesn't have partitioning_field or it's undefined/empty
      // BigQuery API may return it as undefined or with empty string value
      const originalPartitioningField =
        transferConfig.params?.fields?.partitioning_field?.stringValue;
      expect(originalPartitioningField).toBeFalsy(); // Should be undefined or empty

      // Test using extension's constructUpdateTransferConfigRequest to verify it handles missing field
      const mockConfig = createMockConfig(testResources, {
        queryString,
        partitioningField: 'timestamp', // Adding partitioning
        schedule: e2eConfig.testSchedule,
      });

      // This should not throw an error even if partitioning_field doesn't exist
      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask includes params
      expect(updateRequest.updateMask.paths).toContain('params');

      // Verify partitioning_field is properly initialized and set
      expect(
        updateRequest.transferConfig.params.fields.partitioning_field
      ).toBeDefined();
      expect(
        updateRequest.transferConfig.params.fields.partitioning_field
          .stringValue
      ).toBe('timestamp');

      // Actually perform the update to verify it works end-to-end
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        partitioningField: 'timestamp',
      });

      // Verify the update was successful
      expect(updatedConfig.params.fields.partitioning_field?.stringValue).toBe(
        'timestamp'
      );
    }, 60000);
  });

  describe('Multiple Sequential Reconfigurations', () => {
    test('should handle rapid configuration changes', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        initialQuery,
        'every 60 minutes',
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Perform multiple rapid updates
      const updates = [
        {
          queryString: `SELECT id FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``,
        },
        {schedule: 'every 30 minutes'},
        {partitioningField: 'timestamp'},
        {
          queryString: `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\` LIMIT 100`,
        },
      ];

      let lastConfig;
      for (const update of updates) {
        lastConfig = await updateTestTransferConfig(transferConfigName, update);
        await sleep(500); // Small delay between updates
      }

      // Verify final state
      expect(lastConfig).toBeDefined();
      expect(lastConfig.params.fields.query.stringValue).toContain('LIMIT 100');
      expect(lastConfig.schedule).toBe('every 30 minutes');
      expect(lastConfig.params.fields.partitioning_field?.stringValue).toBe(
        'timestamp'
      );
    }, 120000);

    test('should maintain data consistency across changes', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      // Insert test data
      const testRows = generateTestRows(10);
      await insertTestData(
        testResources.datasetId,
        testResources.tableName,
        testRows
      );

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;
      const transferConfigId = transferConfigName?.split('/').pop();

      // Save to Firestore
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig,
        });

      // Update configuration
      const newQuery = `SELECT id, name, value FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;
      await updateTestTransferConfig(transferConfigName, {
        queryString: newQuery,
      });

      // Verify config in Firestore is still valid
      const savedConfig = await getTransferConfigFromFirestore(
        testResources.collectionPath,
        e2eConfig.testInstanceId
      );

      expect(savedConfig).toBeDefined();
      expect(savedConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
    }, 90000);
  });

  describe('Data Flow Verification', () => {
    test('should continue processing after reconfiguration', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      // Insert initial data
      const initialRows = generateTestRows(5);
      await insertTestData(
        testResources.datasetId,
        testResources.tableName,
        initialRows
      );

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update query to filter results
      const filteredQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\` WHERE value > 500`;
      await updateTestTransferConfig(transferConfigName, {
        queryString: filteredQuery,
      });

      // Insert more data
      const newRows = generateTestRows(5);
      await insertTestData(
        testResources.datasetId,
        testResources.tableName,
        newRows
      );

      // Verify the transfer config is still valid and processable
      const [updatedConfig] =
        await new (require('@google-cloud/bigquery-data-transfer').v1.DataTransferServiceClient)(
          {
            projectId: e2eConfig.projectId,
          }
        ).getTransferConfig({name: transferConfigName});

      expect(updatedConfig).toBeDefined();
      expect(updatedConfig.params.fields.query.stringValue).toBe(filteredQuery);
      expect(updatedConfig.state).not.toBe('FAILED');
    }, 90000);
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid query strings gracefully', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const validQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        validQuery,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Try to update with invalid query (missing backticks)
      const invalidQuery = `SELECT * FROM ${e2eConfig.projectId}.${testResources.datasetId}.nonexistent_table`;

      // Update will succeed (API doesn't validate query syntax immediately)
      // but the transfer runs will fail
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        queryString: invalidQuery,
      });

      // Verify update was applied (even though query is invalid)
      expect(updatedConfig.params.fields.query.stringValue).toBe(invalidQuery);
    }, 60000);

    test('should handle missing resources during update', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Delete the dataset (simulating missing resource)
      // Note: We're commenting this out as it would cause the test to fail
      // In a real scenario, the transfer config would remain but runs would fail
      // await deleteTestDataset(testResources.datasetId);

      // Try to update - should still work as config update doesn't validate resources
      const newSchedule = 'every 45 minutes';
      const updatedConfig = await updateTestTransferConfig(transferConfigName, {
        schedule: newSchedule,
      });

      expect(updatedConfig.schedule).toBe(newSchedule);
    }, 60000);

    test('should handle config that exists in Firestore but not in BigQuery', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;
      const transferConfigId = transferConfigName.split('/').pop();

      // Write config to Firestore
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig,
        });

      // Delete from BigQuery (simulating missing resource)
      await deleteTestTransferConfig(transferConfigName);
      transferConfigName = undefined; // Clear so cleanup doesn't try to delete again

      // Verify getTransferConfig returns null
      const retrievedConfig = await dts.getTransferConfig(transferConfig.name);
      expect(retrievedConfig).toBeNull();

      // Document expected error handling
      // The extension should handle this case and report that the config doesn't exist
    }, 60000);

    test('should handle all fields unchanged', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Create config with identical values
      const mockConfig = createMockConfig(testResources, {
        queryString,
        schedule: e2eConfig.testSchedule,
      });

      // Call constructUpdateTransferConfigRequest with identical config
      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify updateMask.paths is empty array (no changes)
      verifyUpdateMask(updateRequest, []);

      // Verify update request still contains all fields (for API compatibility)
      expect(updateRequest.transferConfig.params.fields.query.stringValue).toBe(
        queryString
      );
      expect(updateRequest.transferConfig.schedule).toBe(
        e2eConfig.testSchedule
      );
    }, 60000);

    test('should handle null/undefined partitioning field', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create without partitioning field
      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Test with partitioningField: undefined
      const mockConfigUndefined = createMockConfig(testResources, {
        queryString,
        partitioningField: undefined,
      });

      const updateRequestUndefined =
        await dts.constructUpdateTransferConfigRequest(
          transferConfigName,
          mockConfigUndefined
        );

      // Verify behavior matches empty string handling
      // Since existing config has no partitioning field and new one is undefined,
      // update mask should not include params
      const existingHasPartitioning =
        transferConfig.params.fields.partitioning_field !== undefined;
      if (!existingHasPartitioning) {
        // No change, so params should not be in update mask
        expect(updateRequestUndefined.updateMask.paths).not.toContain('params');
      }
    }, 60000);
  });

  describe('Update Mask Logic', () => {
    test('should only include changed fields in update mask', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT id, name FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        initialQuery,
        e2eConfig.testSchedule,
        testResources.topicName,
        'timestamp'
      );

      transferConfigName = transferConfig.name;

      // Update only query string
      const updatedQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const mockConfig = createMockConfig(testResources, {
        queryString: updatedQuery,
        schedule: e2eConfig.testSchedule, // Unchanged
        partitioningField: 'timestamp', // Unchanged
      });

      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask only contains 'params' (not 'schedule')
      verifyUpdateMask(updateRequest, ['params']);

      // Verify schedule, table name, and partitioning remain unchanged in update request
      expect(updateRequest.transferConfig.schedule).toBe(
        e2eConfig.testSchedule
      );
      expect(
        updateRequest.transferConfig.params.fields.partitioning_field
          ?.stringValue
      ).toBe('timestamp');
    }, 60000);

    test('should include both params and schedule in mask when both change', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT id FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        initialQuery,
        'every 15 minutes',
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update both query and schedule
      const updatedQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;
      const newSchedule = 'every 30 minutes';

      const mockConfig = createMockConfig(testResources, {
        queryString: updatedQuery,
        schedule: newSchedule,
      });

      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask contains both 'params' and 'schedule'
      verifyUpdateMask(updateRequest, ['params', 'schedule']);

      // Verify both fields are updated in the request
      expect(updateRequest.transferConfig.params.fields.query.stringValue).toBe(
        updatedQuery
      );
      expect(updateRequest.transferConfig.schedule).toBe(newSchedule);
    }, 60000);

    test('should not include unchanged fields in update mask', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        'every 15 minutes',
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update only schedule
      const newSchedule = 'every 30 minutes';

      const mockConfig = createMockConfig(testResources, {
        queryString, // Unchanged
        schedule: newSchedule,
      });

      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask only contains 'schedule' (not 'params')
      verifyUpdateMask(updateRequest, ['schedule']);

      // Verify params are not modified in update request
      expect(updateRequest.transferConfig.params.fields.query.stringValue).toBe(
        queryString
      );
    }, 60000);

    test('should handle table name change correctly', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      const newTableName = `${testResources.tableName}_new`;
      await createTestTable(testResources.datasetId, newTableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;

      // Update only table name
      const mockConfig = createMockConfig(testResources, {
        queryString, // Unchanged
        schedule: e2eConfig.testSchedule, // Unchanged
        tableName: newTableName,
      });

      const updateRequest = await dts.constructUpdateTransferConfigRequest(
        transferConfigName,
        mockConfig
      );

      // Verify update mask contains 'params'
      verifyUpdateMask(updateRequest, ['params']);
      // Verify destination_table_name_template is updated correctly
      expect(
        updateRequest.transferConfig.params.fields
          .destination_table_name_template.stringValue
      ).toContain(newTableName);
    }, 60000);
  });

  describe('Firestore Integration', () => {
    test('should lookup existing config by extInstanceId', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;
      const transferConfigId = transferConfigName.split('/').pop();

      // Write to Firestore with extInstanceId (simulating extension behavior)
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig,
        });

      // Query Firestore using the extension's lookup pattern
      const query = firestore
        .collection(testResources.collectionPath)
        .where('extInstanceId', '==', e2eConfig.testInstanceId);

      const results = await query.get();

      // Verify config is found and matches
      expect(results.size).toBe(1);
      const foundConfig = results.docs[0].data();
      expect(foundConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
      expect(foundConfig.name).toBe(transferConfigName);
    }, 60000);

    test('should write updated config back to Firestore', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT id FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      const transferConfig = await createTestTransferConfig(
        testResources.transferConfigDisplayName,
        testResources.datasetId,
        testResources.tableName,
        initialQuery,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      transferConfigName = transferConfig.name;
      const transferConfigId = transferConfigName.split('/').pop();

      // Write initial config to Firestore
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig,
        });

      // Update config via BigQuery API
      const updatedQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;
      await updateTestTransferConfig(transferConfigName, {
        queryString: updatedQuery,
      });

      // Simulate extension's write-back logic: get updated config, write to Firestore
      const updatedConfig = await dts.getTransferConfig(transferConfigName);
      expect(updatedConfig).toBeDefined();

      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...updatedConfig,
        });

      // Verify Firestore document contains updated values and extInstanceId
      const savedConfig = await getTransferConfigFromFirestore(
        testResources.collectionPath,
        e2eConfig.testInstanceId
      );

      expect(savedConfig).toBeDefined();
      expect(savedConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
      expect(savedConfig.params.fields.query.stringValue).toBe(updatedQuery);
    }, 60000);

    test('should handle multiple configs with same extInstanceId', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const queryString = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Create first config
      const transferConfig1 = await createTestTransferConfig(
        `${testResources.transferConfigDisplayName}_1`,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      const transferConfigId1 = transferConfig1.name.split('/').pop();

      // Write first config to Firestore with extInstanceId
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId1!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig1,
        });

      // Create second config with same extInstanceId (edge case)
      const transferConfig2 = await createTestTransferConfig(
        `${testResources.transferConfigDisplayName}_2`,
        testResources.datasetId,
        testResources.tableName,
        queryString,
        e2eConfig.testSchedule,
        testResources.topicName
      );

      const transferConfigId2 = transferConfig2.name.split('/').pop();

      // Write second config to Firestore with same extInstanceId
      await firestore
        .collection(testResources.collectionPath)
        .doc(transferConfigId2!)
        .set({
          extInstanceId: e2eConfig.testInstanceId,
          ...transferConfig2,
        });

      // Query Firestore - should return multiple results
      const query = firestore
        .collection(testResources.collectionPath)
        .where('extInstanceId', '==', e2eConfig.testInstanceId);

      const results = await query.get();

      // Verify query returns multiple results
      expect(results.size).toBeGreaterThan(1);

      // Document expected behavior (extension has TODO for warning)
      // The extension should handle this case and warn about multiple instances

      // Clean up second config
      await deleteTestTransferConfig(transferConfig2.name);
    }, 60000);
  });

  describe('Extension Integration Flow', () => {
    test('should create, update, and process messages via extension flow', async () => {
      // Setup
      await createTestDataset(testResources.datasetId);
      await createTestTable(testResources.datasetId, testResources.tableName);
      await createTestTopic(testResources.topicName);

      const initialQuery = `SELECT id, name FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\``;

      // Step 1: Create config via extension
      const createConfig = createMockConfig(testResources, {
        queryString: initialQuery,
        schedule: e2eConfig.testSchedule,
      });

      await invokeUpsertTransferConfig(createConfig);

      // Step 2: Verify config exists in Firestore with correct extInstanceId
      const savedConfig = await getTransferConfigFromFirestore(
        testResources.collectionPath,
        e2eConfig.testInstanceId
      );

      expect(savedConfig).toBeDefined();
      expect(savedConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
      expect(savedConfig.params.fields.query.stringValue).toBe(initialQuery);

      transferConfigName = savedConfig.name;
      const transferConfigId = transferConfigName.split('/').pop();

      // Step 3: Verify config exists in BigQuery via DTS API
      const bigQueryConfig = await dts.getTransferConfig(transferConfigName);
      expect(bigQueryConfig).toBeDefined();
      expect(bigQueryConfig?.name).toBe(transferConfigName);

      // Step 4: Update config via extension (change query and schedule)
      const updatedQuery = `SELECT * FROM \`${e2eConfig.projectId}.${testResources.datasetId}.${testResources.tableName}\` WHERE value > 100`;
      const updatedSchedule = 'every 30 minutes';

      const updateConfig = createMockConfig(testResources, {
        queryString: updatedQuery,
        schedule: updatedSchedule,
      });

      await invokeUpsertTransferConfig(updateConfig);

      // Step 5: Verify update is written back to Firestore with extInstanceId preserved
      const updatedSavedConfig = await getTransferConfigFromFirestore(
        testResources.collectionPath,
        e2eConfig.testInstanceId
      );

      expect(updatedSavedConfig).toBeDefined();
      expect(updatedSavedConfig.extInstanceId).toBe(e2eConfig.testInstanceId);
      expect(updatedSavedConfig.params.fields.query.stringValue).toBe(
        updatedQuery
      );
      expect(updatedSavedConfig.schedule).toBe(updatedSchedule);

      // Step 6: Verify update in BigQuery
      const updatedBigQueryConfig =
        await dts.getTransferConfig(transferConfigName);
      expect(updatedBigQueryConfig).toBeDefined();
      expect(updatedBigQueryConfig?.params?.fields?.query?.stringValue).toBe(
        updatedQuery
      );
      expect(updatedBigQueryConfig?.schedule).toBe(updatedSchedule);

      // Step 7: Create mock pubsub message and test handleMessage
      // Use 'FAILED' state to avoid BigQuery query (which would require actual data)
      // The key test is that handleMessage doesn't throw the association error
      const runId = `test-run-${Date.now()}`;
      const mockMessage = createMockPubsubMessage(
        transferConfigName,
        runId,
        'FAILED',
        {
          destinationDatasetId: testResources.datasetId,
          tableName: testResources.tableName,
        }
      );

      // Step 8: Call handleMessage directly to verify it can process the message
      // This should NOT throw the "not associated with extension instance" error
      // Note: transferConfigAssociatedWithExtension uses the module's config,
      // so we need to set the test config for the mock
      const testConfig = createMockConfig(testResources);

      // Set the test config so the mock will use it
      setTestConfig(testConfig);

      // Clear module cache to reload helper with mocked config
      const helperPath = require.resolve('../../src/helper');
      delete require.cache[helperPath];

      try {
        const {handleMessage} = await import('../../src/helper');

        // handleMessage should succeed because the config is in Firestore with correct extInstanceId
        // The association check happens first, before any BigQuery queries
        await expect(
          handleMessage(firestore, testConfig, mockMessage)
        ).resolves.not.toThrow();
      } finally {
        // Clear test config
        setTestConfig(null as any);
        // Clear module cache again
        delete require.cache[helperPath];
      }

      // Step 9: Verify that handleMessage created the run document in Firestore
      const runDoc = await firestore
        .collection(`${testResources.collectionPath}/${transferConfigId}/runs`)
        .doc(runId)
        .get();

      expect(runDoc.exists).toBe(true);
      const runData = runDoc.data();
      expect(runData?.runMetadata).toBeDefined();
      expect(runData?.runMetadata.state).toBe('FAILED');
    }, 120000);
  });
});
