import {Config} from '../src/types';
import * as dts from '../src/dts';
import {getTransferConfigResponse} from './fixtures/transferConfigResonse';

jest.mock('../src/config', () => {
  return {
    default: {
      location: 'us-central1',
      bigqueryDatasetLocation: 'us',
      displayName: 'Transactions Rollup',
      datasetId: 'destination_dataset_id',
      tableName: 'transactions',
      queryString: 'Select * from `test-project.transaction_data.transactions`',
      partitioningField: '',
      schedule: 'every 15 minutes',
      pubSubTopic: 'transfer_runs',
      firestoreCollection: 'transferConfigs',
      instanceId: 'firestore-bigquery-scheduler',
      projectId: 'test',
    },
  };
});

const mockGetTransferConfig = jest.fn();
const mockCreateTransferConfig = jest.fn();
const mockUpdateTransferConfig = jest.fn();

jest.mock('@google-cloud/bigquery-data-transfer', () => {
  return {
    v1: {
      DataTransferServiceClient: jest.fn().mockImplementation(() => {
        return {
          getTransferConfig: mockGetTransferConfig.mockImplementation(
            request => {
              // Conditional response based on the request name
              if (request.name.includes('wrong-id')) {
                return [null]; // Simulate returning null for wrong IDs
              }
              if (request.name.includes('api-error')) {
                throw new Error('API Error');
              }
              return getTransferConfigResponse;
            }
          ),
          createTransferConfig: mockCreateTransferConfig.mockImplementation(
            () => {
              return [
                {
                  name: 'projects/test/locations/us/transferConfigs/new-config-id',
                },
              ];
            }
          ),
          updateTransferConfig: mockUpdateTransferConfig.mockImplementation(
            () => {
              return [
                {
                  name: 'projects/test/locations/us/transferConfigs/updated-config-id',
                },
              ];
            }
          ),
        };
      }),
    },
    protos: {
      google: {
        cloud: {
          bigquery: {
            datatransfer: {
              v1: {
                UpdateTransferConfigRequest: {
                  fromObject: jest.fn().mockImplementation(obj => obj),
                },
              },
            },
          },
        },
      },
    },
  };
});

describe('dts', () => {
  describe('createTransferConfigRequest', () => {
    test('returns the correct output given the config', async () => {
      const testConfig: Config = {
        location: 'us-central1',
        bigqueryDatasetLocation: 'us',
        displayName: 'Transactions Rollup',
        datasetId: 'destination_dataset_id',
        tableName: 'transactions',
        queryString:
          'Select * from `test-project.transaction_data.transactions`',
        partitioningField: '',
        schedule: 'every 15 minutes',
        pubSubTopic: 'transfer_runs',
        firestoreCollection: 'transferConfigs',
        instanceId: 'firestore-bigquery-scheduler',
        projectId: 'test',
      };
      const expected = {
        parent: 'projects/test',
        transferConfig: {
          destinationDatasetId: 'destination_dataset_id',
          displayName: 'Transactions Rollup',
          dataSourceId: 'scheduled_query',
          params: {
            fields: {
              query: {
                stringValue:
                  'Select * from `test-project.transaction_data.transactions`',
              },
              destination_table_name_template: {
                stringValue: 'transactions_{run_time|"%H%M%S"}',
              },
              write_disposition: {stringValue: 'WRITE_TRUNCATE'},
              partitioning_field: {stringValue: ''},
            },
          },
          schedule: 'every 15 minutes',
          notificationPubsubTopic: 'projects/test/topics/transfer_runs',
        },
      };

      expect(dts.createTransferConfigRequest(testConfig)).toEqual(expected);
    });
  });

  const baseConfig: Config = {
    location: 'us-central1',
    bigqueryDatasetLocation: 'us',
    displayName: 'Transactions Rollup',
    datasetId: 'destination_dataset_id',
    tableName: 'transactions',
    queryString: 'Select * from `test-project.transaction_data.transactions`',
    partitioningField: '',
    schedule: 'every 15 minutes',
    pubSubTopic: 'transfer_runs',
    firestoreCollection: 'transferConfigs',
    instanceId: 'firestore-bigquery-scheduler',
    projectId: 'test',
  };

  const baseResponse = {
    name: 'projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6',
    transferConfig: {
      dataSourceId: 'scheduled_query',
      destinationDatasetId: 'destination_dataset_id',
      displayName: 'Transactions Rollup',
      name: 'projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6',
      notificationPubsubTopic: 'projects/test/topics/transfer_runs',
      params: {
        fields: {
          destination_table_name_template: {
            stringValue: 'transactions_{run_time|"%H%M%S"}',
          },
          partitioning_field: {stringValue: ''},
          query: {
            stringValue:
              'Select * from `test-project.transaction_data.transactions`',
          },
          write_disposition: {stringValue: 'WRITE_TRUNCATE'},
        },
      },
      schedule: 'every 15 minutes',
    },
    updateMask: {paths: []},
  };

  describe('updateTransferConfigRequest', () => {
    test('config not found', async () => {
      const wrongName =
        'projects/409146382768/locations/us/transferConfigs/wrong-id';

      // Correct way: wrap the function call in another function
      await expect(async () => {
        await dts.constructUpdateTransferConfigRequest(wrongName, baseConfig);
      }).rejects.toThrow('Transfer config not found');
    });

    test('no change to the config', async () => {
      const testConfig = baseConfig;
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test('schedule is changed', async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.schedule = 'every 24 hours';
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.schedule = 'every 24 hours';
      expectedResponse.updateMask = {paths: ['schedule']};
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test('destination table name is changed', async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.tableName = 'different_table';
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.params.fields.destination_table_name_template.stringValue =
        'different_table_{run_time|"%H%M%S"}';
      expectedResponse.updateMask = {paths: ['params']};
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test('query string is changed', async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.queryString = 'SELECT * from differenttable';
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.params.fields.query.stringValue =
        'SELECT * from differenttable';
      expectedResponse.updateMask = {paths: ['params']};
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });

    test('empty partitioning field should not cause params update when only schedule changes', async () => {
      // This test reproduces the bug from issue #2544
      // When partitioningField is empty/undefined and schedule changes,
      // the update should not include partitioning_field in params
      const testConfig = Object.assign({}, baseConfig);
      testConfig.schedule = 'every 24 hours';
      testConfig.partitioningField = ''; // Empty, same as existing

      const result = await dts.constructUpdateTransferConfigRequest(
        baseResponse.name,
        testConfig
      );

      // Should only update schedule, not params
      expect(result.updateMask.paths).toEqual(['schedule']);
      // partitioning_field should remain unchanged (empty string)
      expect(
        result.transferConfig.params.fields.partitioning_field.stringValue
      ).toBe('');
    });

    test('undefined partitioning field should not include partitioning_field in update', async () => {
      // This test reproduces the exact bug from issue #2544
      // When partitioningField is undefined (not set in config) and other params change,
      // the update should not set partitioning_field to undefined
      const testConfig = Object.assign({}, baseConfig);
      testConfig.queryString = 'SELECT * from newtable';
      testConfig.partitioningField = undefined as unknown as string; // Simulates unset config

      const result = await dts.constructUpdateTransferConfigRequest(
        baseResponse.name,
        testConfig
      );

      // Should update params for query change
      expect(result.updateMask.paths).toContain('params');
      // But partitioning_field should NOT be set to undefined - it should keep the existing value
      expect(
        result.transferConfig.params.fields.partitioning_field.stringValue
      ).toBe(''); // Should remain empty string, not undefined
    });
  });

  describe('getTransferConfig', () => {
    beforeEach(() => {
      mockGetTransferConfig.mockClear();
    });

    test('returns transfer config when found', async () => {
      const result = await dts.getTransferConfig(baseResponse.name);

      expect(result).toEqual(getTransferConfigResponse[0]);
      expect(mockGetTransferConfig).toHaveBeenCalledWith({
        name: baseResponse.name,
      });
    });

    test('returns null when API throws error', async () => {
      const result = await dts.getTransferConfig(
        'projects/test/locations/us/transferConfigs/api-error'
      );

      expect(result).toBeNull();
    });
  });

  describe('createTransferConfig', () => {
    beforeEach(() => {
      mockCreateTransferConfig.mockClear();
    });

    test('successfully creates transfer config and returns response', async () => {
      const result = await dts.createTransferConfig();

      expect(result).toEqual({
        name: 'projects/test/locations/us/transferConfigs/new-config-id',
      });
      expect(mockCreateTransferConfig).toHaveBeenCalled();
    });
  });

  describe('updateTransferConfig', () => {
    beforeEach(() => {
      mockUpdateTransferConfig.mockClear();
      mockGetTransferConfig.mockClear();
    });

    test('successfully updates transfer config and returns response', async () => {
      const result = await dts.updateTransferConfig(baseResponse.name);

      expect(result).toEqual({
        name: 'projects/test/locations/us/transferConfigs/updated-config-id',
      });
      expect(mockUpdateTransferConfig).toHaveBeenCalled();
    });

    test('returns null when transfer config not found', async () => {
      const result = await dts.updateTransferConfig(
        'projects/test/locations/us/transferConfigs/wrong-id'
      );

      expect(result).toBeNull();
    });

    test('returns null when API throws error', async () => {
      mockUpdateTransferConfig.mockImplementationOnce(() => {
        throw new Error('Update API Error');
      });

      const result = await dts.updateTransferConfig(baseResponse.name);

      expect(result).toBeNull();
    });
  });
});
