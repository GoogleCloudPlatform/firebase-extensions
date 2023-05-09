import { Config } from "../src/types";
import * as dts from "../src/dts";
import { getTransferConfigResponse } from "./fixtures/transferConfigResonse";

jest.mock("@google-cloud/bigquery-data-transfer", () => {
  return {
    v1: {
      DataTransferServiceClient: jest.fn().mockImplementation(() => {
        return {
          getTransferConfig: jest.fn().mockImplementation(() => {
            return getTransferConfigResponse;
          }),
        };
      }),
    },
  };
});

describe("dts", () => {
  describe("createTransferConfigRequest", () => {
    test("returns the correct output given the config", async () => {
      const testConfig: Config = {
        location: "us-central1",
        bigqueryDatasetLocation: "us",
        displayName: "Transactions Rollup",
        datasetId: "destination_dataset_id",
        tableName: "transactions",
        queryString:
          "Select * from `test-project.transaction_data.transactions`",
        partitioningField: "",
        schedule: "every 15 minutes",
        pubSubTopic: "transfer_runs",
        firestoreCollection: "transferConfigs",
        instanceId: "firestore-bigquery-scheduler",
        projectId: "test",
      };
      const expected = {
        parent: "projects/test",
        transferConfig: {
          destinationDatasetId: "destination_dataset_id",
          displayName: "Transactions Rollup",
          dataSourceId: "scheduled_query",
          params: {
            fields: {
              query: {
                stringValue:
                  "Select * from `test-project.transaction_data.transactions`",
              },
              destination_table_name_template: {
                stringValue: 'transactions_{run_time|"%H%M%S"}',
              },
              write_disposition: { stringValue: "WRITE_TRUNCATE" },
              partitioning_field: { stringValue: "" },
            },
          },
          schedule: "every 15 minutes",
          notificationPubsubTopic: "projects/test/topics/transfer_runs",
        },
      };

      expect(dts.createTransferConfigRequest(testConfig)).toEqual(expected);
    });
  });

  const baseConfig: Config = {
    location: "us-central1",
    bigqueryDatasetLocation: "us",
    displayName: "Transactions Rollup",
    datasetId: "destination_dataset_id",
    tableName: "transactions",
    queryString: "Select * from `test-project.transaction_data.transactions`",
    partitioningField: "",
    schedule: "every 15 minutes",
    pubSubTopic: "transfer_runs",
    firestoreCollection: "transferConfigs",
    instanceId: "firestore-bigquery-scheduler",
    projectId: "test",
  };

  const baseResponse = {
    name: "projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6",
    transferConfig: {
      dataSourceId: "scheduled_query",
      destinationDatasetId: "destination_dataset_id",
      displayName: "Transactions Rollup",
      name: "projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6",
      notificationPubsubTopic: "projects/test/topics/transfer_runs",
      params: {
        fields: {
          destination_table_name_template: {
            stringValue: 'transactions_{run_time|"%H%M%S"}',
          },
          partitioning_field: { stringValue: "" },
          query: {
            stringValue:
              "Select * from `test-project.transaction_data.transactions`",
          },
          write_disposition: { stringValue: "WRITE_TRUNCATE" },
        },
      },
      schedule: "every 15 minutes",
    },
    updateMask: { paths: [] },
  };

  describe("updateTransferConfigRequest", () => {
    test("no change to the config", async () => {
      const testConfig = baseConfig;
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test("schedule is changed", async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.schedule = "every 24 hours";
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.schedule = "every 24 hours";
      expectedResponse.updateMask = { paths: ["schedule"] };
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test("destination table name is changed", async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.tableName = "different_table";
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.params.fields.destination_table_name_template.stringValue =
        'different_table_{run_time|"%H%M%S"}';
      expectedResponse.updateMask = { paths: ["params"] };
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
    test("query string is changed", async () => {
      const testConfig = Object.assign({}, baseConfig);
      testConfig.queryString = "SELECT * from differenttable";
      const expectedResponse = JSON.parse(JSON.stringify(baseResponse));
      expectedResponse.transferConfig.params.fields.query.stringValue =
        "SELECT * from differenttable";
      expectedResponse.updateMask = { paths: ["params"] };
      expect(
        await dts.constructUpdateTransferConfigRequest(
          baseResponse.name,
          testConfig
        )
      ).toEqual(expectedResponse);
    });
  });
});
