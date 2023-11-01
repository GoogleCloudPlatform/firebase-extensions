import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions-test';
import {syncData} from '../src/index';
import {getTable, initialize} from '../src/bigquery';

import config from '../src/config';
import {Table} from '@google-cloud/bigquery';
import {clearBQTables} from './helpers';

jest.mock('../src/config', () => ({
  default: {
    table: '',
    dataset: '',
    datasetLocation: 'us',
    syncCollectionPath: 'testing',
  },
}));

/** Setup project config */
const projectId = 'dev-extensions-testing';
const fft = functions({projectId});

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.PUBSUB_EMULATOR_HOST = '127.0.0.1:8085';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-test';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

/** Global vars */
const {makeDocumentSnapshot} = fft.firestore;

const db = admin.firestore();
const collection = db.collection(config.syncCollectionPath);
let randomId = '';

xdescribe('functions', () => {
  beforeAll(async () => {
    /** clear all datasets */
    await clearBQTables();
  });
  beforeEach(async () => {
    /** generate random id */
    randomId = (Math.random() + 1).toString(36).substring(7);

    config.table = randomId;
    config.dataset = randomId;

    await initialize();
  });

  xit('Can sync data with BQ', async () => {
    /** Set document data */
    const doc = await collection.add({});
    const path = `${config.syncCollectionPath}/${doc.id}`;
    const snap = makeDocumentSnapshot({foo: 'bar'}, path);

    /** Run the function */
    const wrapped = fft.wrap(syncData);
    await wrapped(snap);

    /** check data has synced */
    const table: Table = await getTable(config.dataset, config.table);

    /** wait for 2 seconds */
    await new Promise(resolve => setTimeout(resolve, 2000));

    const [query] = await table.createQueryJob({
      query: `Select * from ${config.dataset}.${config.table}`,
    });

    const [results] = await query.getQueryResults();
    const {foo} = JSON.parse(results[0].data);

    expect(foo).toEqual('bar');
  });

  it('Can replay data', async () => {
    /** Set document data */
    const doc = await collection.add({});
    const path = `${config.syncCollectionPath}/${doc.id}`;

    /** Make an array of 10 items */
    const snapshots = Array.from(Array(10).keys());

    /** Write snapshots to the database */
    const wrapped = fft.wrap(syncData);
    for await (const snapshot of snapshots) {
      /** Run the function */
      const bs = makeDocumentSnapshot({}, path);
      const as = makeDocumentSnapshot({foo: snapshot}, path);
      const change = fft.makeChange(bs, as);
      await wrapped(change);
    }

    /** check data has synced */
    const table: Table = await getTable(config.dataset, config.table);

    const [query] = await table.createQueryJob({
      query: `Select * from ${config.dataset}.${config.table}`,
    });

    const [results] = await query.getQueryResults();
    const $ = JSON.parse(results[0].data);

    expect($).toEqual({foo: 0});

    /** */
  });
});
