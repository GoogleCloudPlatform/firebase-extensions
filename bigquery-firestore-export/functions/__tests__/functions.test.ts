/* eslint-disable @typescript-eslint/ban-ts-comment */
import {BigQuery, Dataset} from '@google-cloud/bigquery';
import * as firebaseFunctionsTest from 'firebase-functions-test';
import * as admin from 'firebase-admin';

import config from '../src/config';
import * as functions from '../src';
import {
  deleteAllDocumentsInCollection,
  generateRandomString,
  setupDataset,
} from './helper';
import {mockConfig, updateConfig} from './__mocks__';

const {wrap} = firebaseFunctionsTest();
const db = admin.firestore();

const bq = new BigQuery({projectId: 'dev-extensions-testing'});

jest.mock('firebase-admin/extensions', () => {
  return {
    getExtensions: jest.fn(() => {
      return {
        runtime: jest.fn(() => {
          return {
            setProcessingState: jest.fn(),
          };
        }),
      };
    }),
  };
});

jest.mock('../src/config', () => {
  return {
    default: {
      projectId: 'dev-extensions-testing',
      location: 'us-central1',
      datasetId: 'scheduled_writes',
      tableName: 'scheduled_writes',
      topic: 'firestore-bigquery-scheduler',
      firestoreCollection: 'dev-extensions-testing',
      instanceId: 'dev-extensions-testing',
      pubSubTopic: 'ext-dev-extensions-testing-processMessages',
    },
  };
});

xdescribe('e2e testing', () => {
  describe('transfer configuration', () => {
    let dataset: Dataset;

    beforeEach(() => {
      // Reset the config object before each test
      Object.assign(config, {...mockConfig});
    });

    beforeAll(async () => {
      //@ts-ignore
      [dataset] = await setupDataset(bq, config.datasetId, config.tableName);

      await deleteAllDocumentsInCollection(db, 'dev-extensions-testing');
    });

    afterAll(async () => {
      console.log('deleting dataset');
      await dataset.delete({force: true});
    });

    xtest('returns the correct output given the config', async () => {
      //@ts-ignore
      const wrapped = wrap(functions.upsertTransferConfig);

      await wrapped({data: {}});

      /** assert data */
    });

    test('throws an error if no transfer config provided', async () => {
      //@ts-ignore
      const wrapped = wrap(functions.upsertTransferConfig);

      await expect(wrapped({data: {}})).rejects.toThrowError(
        'not implemented transfer config parameter type object'
      );
    });

    test('successfully creates a new transfer config document', async () => {
      updateConfig(config, {transferConfigName: 'testTransferConfigName'});

      //@ts-ignore
      const wrapped = wrap(functions.upsertTransferConfig);

      await wrapped({data: {}});

      const doc = await admin
        .firestore()
        .collection('dev-extensions-testing')
        .doc('testTransferConfigName')
        .get();

      const {extInstanceId} = doc.data();

      expect(extInstanceId).toBe('test-instance-id');
    });
  });

  describe('processing messages', () => {
    test('successfully processes a message', async () => {
      /** Set variables **/
      const collection = db.collection(config.firestoreCollection);
      const transfterConfigId = generateRandomString();
      const runId = generateRandomString();
      const name = `projects/409146382768/locations/us/transferConfigs/${transfterConfigId}/runs/${runId}`;

      /** Assign documents */
      const document = collection.doc(transfterConfigId);
      const runDoc = document.collection('runs').doc(runId);

      //@ts-ignore
      const wrapped = wrap(functions.processMessages);

      await wrapped({json: {name}});

      /** Get the document */
      const result = await runDoc.get();

      /** Check results */
      expect(result.exists).toBeTruthy();
    });
  });
});
