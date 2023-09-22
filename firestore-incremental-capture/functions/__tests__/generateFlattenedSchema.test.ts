import * as admin from 'firebase-admin';
import * as firebaseFunctionsTest from 'firebase-functions-test';

import {serializer} from '../src/utils/serializer';

const fft = firebaseFunctionsTest({
  projectId: 'demo-project',
});

import {syncData} from '../src/index';
import {prepareUpdate, verifySchema} from './helpers';
const wrapped = fft.wrap(syncData);

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.PUBSUB_EMULATOR_HOST = '127.0.0.1:8085';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-project';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

describe('generateSchema', () => {
  test('should handle an string value', async () => {
    const documentPath = 'products/stringExample';
    const sampleDocData = {
      stringValue: 'Hello, Firestore!',
    };

    db.doc(documentPath).set(sampleDocData);

    const beforeSnap = fft.firestore.makeDocumentSnapshot({}, documentPath);

    const afterSnap = fft.firestore.makeDocumentSnapshot(
      sampleDocData,
      documentPath
    );

    const change = fft.makeChange(beforeSnap, afterSnap);
    wrapped(change);

    await verifySchema(documentPath, {
      stringValue: {type: 'string', value: 'Hello, Firestore!'},
    });
  }, 12000);

  test('should handle an boolean value', async () => {
    const documentPath = 'products/booleanExample';
    const sampleDocData = {
      booleanExample: true,
    };

    const change = await prepareUpdate(fft, documentPath, sampleDocData);
    wrapped(change);

    await verifySchema(documentPath, {
      booleanExample: {type: 'boolean', value: true},
    });
  }, 12000);

  test('should handle an objectValue value', async () => {
    const documentPath = 'products/objectValueExample';
    const sampleDocData = {
      objectValue: {foo: 'bar'},
    };

    const change = await prepareUpdate(fft, documentPath, sampleDocData);
    wrapped(change);

    await verifySchema(documentPath, {
      objectValue: {type: 'object'},
      'objectValue.foo': {type: 'string', value: 'bar'},
    });
  }, 12000);

  test('should handle an multiple objectValue values', async () => {
    const documentPath = 'products/objectValueExample';
    const sampleDocData = {
      objectValue: {foo: 'bar', foo2: 'bar2'},
    };

    const change = await prepareUpdate(fft, documentPath, sampleDocData);
    wrapped(change);

    await verifySchema(documentPath, {
      objectValue: {type: 'object'},
      'objectValue.foo': {type: 'string', value: 'bar'},
      'objectValue.foo2': {type: 'string', value: 'bar2'},
    });
  }, 12000);

  xtest('should handle an objectValue value', () => {
    const sampleDocData = {
      booleanExample: {foo: 'bar'},
    };

    db.doc('products/objectValueExample').set(sampleDocData);

    const beforeSnap = fft.firestore.makeDocumentSnapshot(
      {},
      'products/objectValueExample'
    );

    const afterSnap = fft.firestore.makeDocumentSnapshot(
      sampleDocData,
      'products/objectValueExample'
    );

    const change = fft.makeChange(beforeSnap, afterSnap);
    wrapped(change);
  });

  test('should handle an objectValue value with multiple fields', () => {
    const sampleDocData = {
      booleanExample: {foo: 'bar'},
    };

    db.doc('products/stringExample').set(sampleDocData);

    const beforeSnap = fft.firestore.makeDocumentSnapshot(
      {},
      'products/stringExample'
    );

    const afterSnap = fft.firestore.makeDocumentSnapshot(
      sampleDocData,
      'products/stringExample'
    );

    const change = fft.makeChange(beforeSnap, afterSnap);
    wrapped(change);
  });

  xtest('should generate schema', () => {
    (async () => {
      /** Setup firestore */
      const sampleDocData = {
        stringValue: 'Hello, Firestore!',
        booleanValue: true,
        integerValue: 123,
        floatValue: 123.456,
        objectValue: {
          nestedString: 'Nested value',
          nestedNumber: 42,
        },
        arrayValue: [
          1,
          'string',
          false,
          {objKey: 'objValue'},
          {nestedArray: [1, 2, 3]}, // Convert nested array to an object
          new admin.firestore.GeoPoint(52.379189, 4.899431),
        ],
        geoPointValue: new admin.firestore.GeoPoint(52.379189, 4.899431),
        timestampValue: admin.firestore.Timestamp.now(),
        documentReferenceValue: db
          .collection('sampleCollection')
          .doc('sampleDoc'),
        binaryValue: Buffer.from('Hello, Binary!'),
        complexArray: [
          {key1: 'value1', key2: [1, 2, 3]},
          {nestedArray1: [1, 'string']}, // Convert nested array to an object
          {nestedArray2: [4, 5, 6]}, // Convert nested array to an object
          new admin.firestore.GeoPoint(52.379189, 4.899431),
          admin.firestore.Timestamp.now(),
        ],
      };

      db.doc('products/sampleDoc').set(sampleDocData);

      const beforeSnap = fft.firestore.makeDocumentSnapshot(
        {foo: 'faz'},
        'products/sampleDoc'
      );

      const afterSnap = fft.firestore.makeDocumentSnapshot(
        sampleDocData,
        'products/sampleDoc'
      );

      const change = fft.makeChange(beforeSnap, afterSnap);
      wrapped(change);
    })();
  });
});
