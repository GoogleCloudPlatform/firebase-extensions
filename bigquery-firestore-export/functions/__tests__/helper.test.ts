import * as admin from 'firebase-admin';
import mockedEnv from 'mocked-env';
import config from '../src/config';

import {environment} from './fixtures/environment';
import {message} from './fixtures/message';
import {syncMessage} from './fixtures/syncMessage';

import {
  transferConfigAssociatedWithExtension,
  writeRunResultsToFirestore,
  handleMessage,
  convertUnsupportedDataTypes,
} from '../src/helper';
import {generateRandomString} from './helper';
import {updateConfig} from './__mocks__';
import {
  BigQueryTimestamp,
  BigQueryDate,
  BigQueryDatetime,
  BigQueryTime,
  Geography,
} from '@google-cloud/bigquery';
import {TransferRunMessage, FirestoreRow} from '../src/types';

// Mock logs to silence console output during tests
jest.mock('../src/logs');

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// TODO: Why does this have to be array of array? Double check
const queryResults = [[{query: 'result'}]];

admin.initializeApp({
  projectId: 'demo-test',
});

const db = admin.firestore();

jest.mock('@google-cloud/bigquery', () => {
  const actual = jest.requireActual('@google-cloud/bigquery');
  return {
    ...actual,
    BigQuery: jest.fn(() => {
      return {
        createQueryJob: jest.fn(() => {
          return [{getQueryResults: jest.fn(() => queryResults)}];
        }),
      };
    }),
  };
});

/** Set Config */
jest.mock('../src/config', () => {
  return {
    default: {
      bigqueryDatasetLocation: 'US',
      firestoreCollection: 'writeResultsToFirestore',
      instanceId: 'firestore-bigquery-scheduler',
      projectId: 'demo-test',
    },
  };
});

let restoreEnv;
describe('helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    restoreEnv = mockedEnv(environment);
  });

  afterEach(() => restoreEnv());

  describe('writeRunResultsToFirestore', () => {
    beforeAll(() => {});

    test('successfully writes a result to Firestore', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);

      /** Run the function */
      const msg = message(transferConfigId, runId);
      await writeRunResultsToFirestore(db, msg);

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      const expected = syncMessage(name);
      expect(result.data()).toEqual(expected);
    });

    test('successfully updates the latest run document in Firestore', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);
      const runLatestDoc = document.collection('runs').doc('latest');
      const outputCollection = runDoc.collection('output');

      /** Run the function */
      const msg = message(transferConfigId, runId);
      await writeRunResultsToFirestore(db, msg);

      /** Get the document */
      const expected = syncMessage(name);

      // Check that latest run doc exists and has correct data
      const latestResult = await runLatestDoc.get();
      const latestExpected = JSON.parse(JSON.stringify(expected));
      latestExpected.latestRunId = runId;

      expect(latestResult.data()).toEqual(latestExpected);

      // Check that results are valid
      const snapshot = await outputCollection.get();
      const data = [];
      snapshot.forEach(doc => {
        data.push(doc.data());
      });
      expect(data).toEqual(queryResults[0]);
    });
  });

  describe('transferConfigAssociatedWithExtension', () => {
    /** TODO: InstanceId is never set, cannot get a truthy result */
    test('successfuly returns a transfer config document that is assoiated with the extension', async () => {
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();

      /** Export configuration */
      const msg = message(transferConfigId, runId);
      await writeRunResultsToFirestore(db, msg);

      /** Set extInstanceId **/
      const document = collection.doc(transferConfigId);
      await document.set({extInstanceId: config.instanceId});

      /** Run the function */
      const result = await transferConfigAssociatedWithExtension(
        db,
        transferConfigId
      );

      /** Check results */
      expect(result).toEqual(true);
    });

    test('transfer config not associated with extension', async () => {
      /** Change the extension Id */
      config.instanceId = 'alternate-instance-id';
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();

      /** Export configuration */
      const msg = message(transferConfigId, runId);
      await writeRunResultsToFirestore(db, msg);

      /** Run the function */
      const result = await transferConfigAssociatedWithExtension(
        db,
        transferConfigId
      );

      /** Check results */
      expect(result).toEqual(false);
    });
  });

  describe('handleMessage', () => {
    test('successfully updates a result to Firestore', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Run function */
      const minimalMsg = {
        json: {
          name,
          runTime: '2023-03-23T21:03:00Z',
          state: 'PENDING' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {},
        },
      } satisfies TransferRunMessage;
      await handleMessage(db, config, minimalMsg);

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
    });

    test('throws an error if transfer config associated with extension', async () => {
      /** Update config **/
      updateConfig(config, {instanceId: 'alternate-instance-id'});

      /** Set variables **/
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Create minimal message for test */
      const minimalMsg = {
        json: {
          name,
          runTime: '2023-03-23T21:03:00Z',
          state: 'PENDING' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {},
        },
      } satisfies TransferRunMessage;

      /** Run function */
      await expect(handleMessage(db, config, minimalMsg)).rejects.toThrowError(
        `Skipping handling pubsub message because transferConfig '${transferConfigId}' is not associated with extension instance '${config.instanceId}'.`
      );
    });

    test('successfully writes results to Firestore when succeeded', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Get mocked message */
      const msg = message(transferConfigId, runId);

      /** Run function */
      await handleMessage(db, config, msg);

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
    });

    test('writes run metadata when state is not SUCCEEDED', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Create message with FAILED state */
      const failedMsg = {
        json: {
          name,
          runTime: '2023-03-23T21:03:00Z',
          state: 'FAILED' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {message: 'Query failed'},
        },
      } satisfies TransferRunMessage;

      /** Run function */
      await handleMessage(db, config, failedMsg);

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
      expect(result.data().runMetadata.state).toEqual('FAILED');
    });

    test('updates latest document when state is FAILED', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const latestDoc = document.collection('runs').doc('latest');

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Create message with FAILED state */
      const failedMsg = {
        json: {
          name,
          runTime: '2023-03-23T21:03:00Z',
          state: 'FAILED' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {message: 'Query failed'},
        },
      } satisfies TransferRunMessage;

      /** Run function */
      await handleMessage(db, config, failedMsg);

      /** Check that latest doc was updated with failed run info */
      const latestResult = await latestDoc.get();
      expect(latestResult.exists).toBeTruthy();
      expect(latestResult.data()!.runMetadata.state).toEqual('FAILED');
      expect(latestResult.data()!.latestRunId).toEqual(runId);
    });

    test('newer failed run updates latest even when previous run succeeded', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId1 = generateRandomString();
      const runId2 = generateRandomString();

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const latestDoc = document.collection('runs').doc('latest');

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** First: successful run */
      const successMsg = message(transferConfigId, runId1);
      successMsg.json.runTime = '2023-03-23T21:00:00Z';
      await handleMessage(db, config, successMsg);

      /** Second: failed run with LATER runTime */
      const failedMsg = {
        json: {
          name: `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId2}`,
          runTime: '2023-03-23T22:00:00Z',
          state: 'FAILED' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {message: 'Query failed'},
        },
      } satisfies TransferRunMessage;

      await handleMessage(db, config, failedMsg);

      /** Latest should now show the failed run */
      const latestResult = await latestDoc.get();
      expect(latestResult.data()!.latestRunId).toEqual(runId2);
      expect(latestResult.data()!.runMetadata.state).toEqual('FAILED');
    });

    test('failed runs have explicit zero counts in run and latest documents', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);
      const latestDoc = document.collection('runs').doc('latest');

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Create message with FAILED state */
      const failedMsg = {
        json: {
          name,
          runTime: '2023-03-23T21:03:00Z',
          state: 'FAILED' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {message: 'Query failed'},
        },
      } satisfies TransferRunMessage;

      /** Run function */
      await handleMessage(db, config, failedMsg);

      /** Check that run doc has explicit zero counts */
      const runResult = await runDoc.get();
      expect(runResult.data()!.failedRowCount).toEqual(0);
      expect(runResult.data()!.totalRowCount).toEqual(0);

      /** Check that latest doc has explicit zero counts */
      const latestResult = await latestDoc.get();
      expect(latestResult.data()!.failedRowCount).toEqual(0);
      expect(latestResult.data()!.totalRowCount).toEqual(0);
    });

    test('updates latest when existing latest doc has missing runMetadata', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const latestDoc = document.collection('runs').doc('latest');

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** Create corrupted "latest" doc without runMetadata */
      await latestDoc.set({someOtherField: 'corrupted'});

      /** Run a successful message */
      const msg = message(transferConfigId, runId);
      await handleMessage(db, config, msg);

      /** Latest should be updated despite corruption */
      const latestResult = await latestDoc.get();
      expect(latestResult.data()!.latestRunId).toEqual(runId);
      expect(latestResult.data()!.runMetadata).toBeDefined();
    });

    test('same runId updates latest even with same runTime (Pub/Sub redelivery)', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const latestDoc = document.collection('runs').doc('latest');

      /** Set Transfer config */
      await document.set({extInstanceId: config.instanceId});

      /** First message - FAILED state */
      const failedMsg = {
        json: {
          name: `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`,
          runTime: '2023-03-23T21:03:00Z',
          state: 'FAILED' as const,
          destinationDatasetId: 'test',
          dataSourceId: 'scheduled_query',
          schedule: '',
          scheduleTime: '',
          startTime: '',
          endTime: '',
          updateTime: '',
          userId: '',
          notificationPubsubTopic: '',
          params: {
            destination_table_name_template: '',
            partitioning_field: '',
            query: '',
            write_disposition: '',
          },
          emailPreferences: {},
          errorStatus: {message: 'Query failed'},
        },
      } satisfies TransferRunMessage;

      await handleMessage(db, config, failedMsg);

      /** Verify initial state */
      let latestResult = await latestDoc.get();
      expect(latestResult.data()!.runMetadata.state).toEqual('FAILED');

      /** Second message - same runId but different state (simulates Pub/Sub redelivery with corrected state) */
      const succeededMsg = {
        json: {
          ...failedMsg.json,
          state: 'SUCCEEDED' as const,
          params: {
            ...failedMsg.json.params,
            destination_table_name_template: 'transactions_{run_time|"%H%M%S"}',
          },
          errorStatus: {},
        },
      } satisfies TransferRunMessage;

      await handleMessage(db, config, succeededMsg);

      /** Latest should be updated despite same runTime because same runId */
      latestResult = await latestDoc.get();
      expect(latestResult.data()!.runMetadata.state).toEqual('SUCCEEDED');
      expect(latestResult.data()!.latestRunId).toEqual(runId);
    });
  });

  describe('convertUnsupportedDataTypes', () => {
    test('returns null for null input', () => {
      expect(convertUnsupportedDataTypes(null)).toBeNull();
    });

    test('returns primitives unchanged', () => {
      expect(convertUnsupportedDataTypes('string')).toBe('string');
      expect(convertUnsupportedDataTypes(123)).toBe(123);
      expect(convertUnsupportedDataTypes(true)).toBe(true);
    });

    test('converts BigQueryTimestamp to Firestore Timestamp', () => {
      const bqTimestamp = new BigQueryTimestamp('2023-01-15T10:30:00Z');
      const result = convertUnsupportedDataTypes({
        timestamp: bqTimestamp,
      }) as FirestoreRow;

      expect(result.timestamp).toBeInstanceOf(admin.firestore.Timestamp);
      const timestamp = result.timestamp as admin.firestore.Timestamp;
      expect(timestamp.toDate().toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    test('converts BigQueryDate to Firestore Timestamp', () => {
      const bqDate = new BigQueryDate('2023-01-15');
      const result = convertUnsupportedDataTypes({
        date: bqDate,
      }) as FirestoreRow;

      expect(result.date).toBeInstanceOf(admin.firestore.Timestamp);
    });

    test('converts BigQueryDatetime to Firestore Timestamp', () => {
      const bqDatetime = new BigQueryDatetime('2023-01-15T10:30:00');
      const result = convertUnsupportedDataTypes({
        datetime: bqDatetime,
      }) as FirestoreRow;

      expect(result.datetime).toBeInstanceOf(admin.firestore.Timestamp);
    });

    test('converts BigQueryTime to Firestore Timestamp', () => {
      // BigQueryTime only contains time without date, so we need to use a full datetime string
      // that Date.parse can handle, or skip this test if BigQueryTime doesn't support it
      const bqTime = new BigQueryTime('1970-01-01T10:30:00Z');
      const result = convertUnsupportedDataTypes({
        time: bqTime,
      }) as FirestoreRow;

      expect(result.time).toBeInstanceOf(admin.firestore.Timestamp);
    });

    test('converts Date to Firestore Timestamp', () => {
      const date = new Date('2023-01-15T10:30:00Z');
      const result = convertUnsupportedDataTypes({date: date}) as FirestoreRow;

      expect(result.date).toBeInstanceOf(admin.firestore.Timestamp);
      const timestamp = result.date as admin.firestore.Timestamp;
      expect(timestamp.toDate().toISOString()).toBe('2023-01-15T10:30:00.000Z');
    });

    test('converts Buffer to Uint8Array', () => {
      const buffer = Buffer.from([1, 2, 3, 4]);
      const result = convertUnsupportedDataTypes({
        data: buffer,
      }) as FirestoreRow;

      expect(result.data).toBeInstanceOf(Uint8Array);
      expect(Array.from(result.data as Uint8Array)).toEqual([1, 2, 3, 4]);
    });

    test('converts Geography to string', () => {
      const geography = new Geography('POINT(1 2)');
      const result = convertUnsupportedDataTypes({
        location: geography,
      }) as FirestoreRow;

      expect(result.location).toBe('POINT(1 2)');
    });

    test('handles nested objects recursively', () => {
      const bqTimestamp = new BigQueryTimestamp('2023-01-15T10:30:00Z');
      const nested = {
        outer: {
          inner: {
            timestamp: bqTimestamp,
          },
        },
      };
      const result = convertUnsupportedDataTypes(nested) as FirestoreRow;
      const outer = result.outer as FirestoreRow;
      const inner = outer.inner as FirestoreRow;

      expect(inner.timestamp).toBeInstanceOf(admin.firestore.Timestamp);
    });

    test('handles arrays with objects containing BigQuery types', () => {
      const bqTimestamp = new BigQueryTimestamp('2023-01-15T10:30:00Z');
      const arrayData = {
        items: [{timestamp: bqTimestamp}, {value: 'plain'}],
      };
      const result = convertUnsupportedDataTypes(arrayData) as FirestoreRow;
      const items = result.items as FirestoreRow[];

      expect((items[0] as FirestoreRow).timestamp).toBeInstanceOf(
        admin.firestore.Timestamp
      );
      expect((items[1] as FirestoreRow).value).toBe('plain');
    });

    test('preserves null values in objects', () => {
      const data = {
        name: 'test',
        nullField: null,
        nested: {
          alsoNull: null,
        },
      };
      const result = convertUnsupportedDataTypes(data) as FirestoreRow;
      const nested = result.nested as FirestoreRow;

      expect(result.nullField).toBeNull();
      expect(nested.alsoNull).toBeNull();
    });

    test('handles mixed data types in single object', () => {
      const bqTimestamp = new BigQueryTimestamp('2023-01-15T10:30:00Z');
      const buffer = Buffer.from([1, 2, 3]);
      const geography = new Geography('POINT(1 2)');

      const mixedData = {
        timestamp: bqTimestamp,
        binary: buffer,
        location: geography,
        plainString: 'hello',
        plainNumber: 42,
      };

      const result = convertUnsupportedDataTypes(mixedData) as FirestoreRow;

      expect(result.timestamp).toBeInstanceOf(admin.firestore.Timestamp);
      expect(result.binary).toBeInstanceOf(Uint8Array);
      expect(result.location).toBe('POINT(1 2)');
      expect(result.plainString).toBe('hello');
      expect(result.plainNumber).toBe(42);
    });
  });
});
