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
} from '../src/helper';
import {generateRandomString} from './helper';
import {updateConfig} from './__mocks__';

process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';

// TODO: Why does this have to be array of array? Double check
const queryResults = [[{query: 'result'}]];

admin.initializeApp({
  projectId: 'demo-test',
});

const db = admin.firestore();

jest.mock('@google-cloud/bigquery', () => {
  return {
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
      await handleMessage(db, config, {json: {name}});

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
    });

    test('throws an error if transfer config associated with extension', async () => {
      /** Update config **/
      updateConfig(config, {instanceId: 'alternate-instance-id'});

      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transferConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transferConfigId);
      const runDoc = document.collection('runs').doc(runId);

      /** Run function */
      await expect(
        handleMessage(db, config, {json: {name}})
      ).rejects.toThrowError(
        `Skipping handling pubsub message because transferConfig '${transferConfigId}' is not associated with extension instance '${config.instanceId}'.`
      );
    });

    test('successfully writes results to Firestore when succeeded', async () => {
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

      /** Get mocked message */
      const msg = message(transferConfigId, runId);

      /** Run function */
      await handleMessage(db, config, msg);

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
    });
  });
});
