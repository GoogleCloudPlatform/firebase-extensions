const mockDetectObjects = jest.fn();
const bucket = 'demo-test.appspot.com';
const collectionPath = 'detectedObjects';

import * as admin from 'firebase-admin';
import * as fft from 'firebase-functions-test';
import {ObjectMetadata} from 'firebase-functions/v1/storage';
import setupEnvironment from './helpers/setupEnvironment';
import config from '../src/config';
import {clearFirestore} from './helpers';

const functions = require('../src/index');

setupEnvironment();
jest.spyOn(admin, 'initializeApp').mockImplementation();
const db = admin.firestore();

/** Setup test environment */

const testEnv = fft({
  projectId: 'demo-test',
  storageBucket: bucket,
});

/** Setup Mocks */
jest.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: jest.fn(() => ({
    objectLocalization: mockDetectObjects,
  })),
}));

jest.mock('../src/config', () => ({
  default: {
    collectionPath,
    bucketName: 'demo-test.appspot.com',
    includePathList: null,
    excludePathList: null,
  },
}));

jest.useRealTimers();

describe('detectObjects', () => {
  beforeEach(async () => {
    /** Clear Firestore data */
    await clearFirestore();
  });

  beforeAll(async () => {
    /** Upload test image */
    await admin
      .storage()
      .bucket(bucket)
      .upload(__dirname + '/fixtures/test.jpg');
  });

  afterEach(() => {
    testEnv.cleanup();
    jest.clearAllMocks();
  });

  it('should successfully detect object with no mode set', async () => {
    const name = 'test.jpg';
    const filePath = `gs://${bucket}/${name}`;

    const snapshotQuery = db
      .collection('detectedObjects')
      .where('file', '==', filePath);

    const expectedText = 'Apple';

    mockDetectObjects.mockResolvedValue([
      {
        localizedObjectAnnotations: [
          {
            name: expectedText,
          },
        ],
      },
    ]);

    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name: 'test.jpg',
      contentType: 'image/jpeg',
    };

    const wrapped = testEnv.wrap(functions.detectObjects);
    await wrapped(obj);

    /** Wait a second for the emulator to update */
    await new Promise(resolve => setTimeout(resolve, 1000));

    /** Check if the document was updated */
    const result = await snapshotQuery.get();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const {objects, file} = result.docs[0].data();

    /** Test assertions */
    expect(file).toEqual(`gs://${bucket}/${name}`);
    expect(objects).toEqual([]);
  });

  it('should successfully detect an object with mode set as basic', async () => {
    const name = 'test.jpg';
    const filePath = `gs://${bucket}/${name}`;
    const snapshotQuery = db
      .collection('detectedObjects')
      .where('file', '==', filePath);
    const expectedText = 'Apple';

    /** Setup config */
    config.mode = 'basic';

    mockDetectObjects.mockResolvedValue([
      {
        localizedObjectAnnotations: [
          {
            name: expectedText,
          },
        ],
      },
    ]);

    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name,
      contentType: 'image/jpeg',
    };

    const wrapped = testEnv.wrap(functions.detectObjects);
    await wrapped(obj);

    /** Wait a second for the emulator to update */
    await new Promise(resolve => setTimeout(resolve, 1000));

    /** Check if the document was updated */
    const result = await snapshotQuery.get();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const {objects, file} = result.docs[0].data();

    /** Test assertions */
    expect(file).toEqual(`gs://demo-test.appspot.com/${name}`);
    expect(objects[0]).toEqual('Apple');
  });

  it('should successfully detect object with the mode set as full', async () => {
    const name = 'test.jpg';
    const filePath = `gs://${bucket}/${name}`;
    const snapshotQuery = db
      .collection('detectedObjects')
      .where('file', '==', filePath);
    const expectedText = 'Apple';

    /** Setup config */
    config.mode = 'full';

    mockDetectObjects.mockResolvedValue([
      {
        localizedObjectAnnotations: [
          {
            name: expectedText,
          },
        ],
      },
    ]);

    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name,
      contentType: 'image/jpeg',
    };

    const wrapped = testEnv.wrap(functions.detectObjects);
    await wrapped(obj);

    /** Wait a second for the emulator to update */
    await new Promise(resolve => setTimeout(resolve, 1000));

    /** Check if the document was updated */
    const result = await snapshotQuery.get();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const {objects, file} = result.docs[0].data();

    /** Test assertions */
    expect(file).toEqual(`gs://demo-test.appspot.com/${name}`);
    expect(objects[0].name).toEqual('Apple');
  });

  it('should not update on an annotation error', async () => {
    const name = 'test.jpg';
    const filePath = `gs://${bucket}/${name}`;

    const snapshotQuery = db
      .collection('detectedObjects')
      .where('file', '==', filePath);

    /** Setup config */
    config.mode = 'full';

    mockDetectObjects.mockImplementation(() => {
      throw new Error('Error found');
    });

    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name,
      contentType: 'image/jpeg',
    };

    const wrapped = testEnv.wrap(functions.detectObjects);
    await wrapped(obj);

    /** Wait a second for the emulator to update */
    await new Promise(resolve => setTimeout(resolve, 1000));

    /** Check if the document was updated */
    const result = await snapshotQuery.get();

    /** Test assertions */
    expect(result.docs[0]).toBeUndefined();
  });
});
