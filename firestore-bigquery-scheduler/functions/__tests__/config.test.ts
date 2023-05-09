xdescribe("config", () => {
  test("true is true", () => {
    expect(true).toBeTruthy();
  });
});

// import * as functionsTestInit from "firebase-functions-test";
// import mockedEnv from "mocked-env";
// import { Config } from "../src/types";

// const { config } = global;

// let restoreEnv;

// functionsTestInit();

// const environment = {
//   LOCATION: "us-central1",
//   BIGQUERY_DATASET_LOCATION: "us",
//   TRANSFER_CONFIG_NAME:
//     "projects/11111111111111/locations/us/transferConfigs/645c0eb8-0000-27be-9ba1-94eb2c1cfc8a",
//   DISPLAY_NAME: "Transactions Rollup",
//   DATASET_ID: "destination_dataset_id",
//   TABLE_NAME: "transactions",
//   QUERY_STRING: "Select * from `test-project.transaction_data.transactions`",
//   PARTITIONING_FIELD: "",
//   SCHEDULE: "every 15 minutes",
//   PUB_SUB_TOPIC: "transfer_runs",
//   FIRESTORE_COLLECTION: "transferConfigs",
//   EXT_INSTANCE_ID: "firestore-bigquery-scheduler",
//   PROJECT_ID: "test",
// };

// describe("test", () => {
//   test("functions are exported", () => {
//     expect(true).toBe(true);
//   });
// });

// describe("extensions config", () => {
//   beforeEach(() => {
//     restoreEnv = mockedEnv(environment);
//   });
//   afterEach(() => restoreEnv());

//   test("config loaded from environment variables", () => {
//     const testConfig: Config = {
//       location: "us-central1",
//       bigqueryDatasetLocation: "us",
//       transferConfigName:
//         "projects/11111111111111/locations/us/transferConfigs/645c0eb8-0000-27be-9ba1-94eb2c1cfc8a",
//       displayName: "Transactions Rollup",
//       datasetId: "destination_dataset_id",
//       tableName: "transactions",
//       queryString: "Select * from `test-project.transaction_data.transactions`",
//       partitioningField: "",
//       schedule: "every 15 minutes",
//       pubSubTopic: "transfer_runs",
//       firestoreCollection: "transferConfigs",
//       instanceId: "firestore-bigquery-scheduler",
//       projectId: "test",
//     };
//     const functionsConfig = config();
//     expect(functionsConfig).toStrictEqual(testConfig);
//   });
// });
