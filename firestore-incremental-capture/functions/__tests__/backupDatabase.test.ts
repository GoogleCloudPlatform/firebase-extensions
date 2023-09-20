import {runInitialSetup} from '../src/index';

const mockQueue = jest.fn();

const getFunctionsMock = () => ({
  taskQueue: (functionName: string, instanceId: string) => ({
    enqueue: (data: any) => {
      mockQueue(data);
      return Promise.resolve();
    },
  }),
});

const mockSetProcessingState = jest.fn();

const getExtensionsMock = () => ({
  runtime: () => ({
    setProcessingState: (state: string, message: string) =>
      mockSetProcessingState(state, message),
  }),
});

jest.mock('firebase-admin/functions', () => ({
  ...jest.requireActual('firebase-admin/functions'),
  getFunctions: () => getFunctionsMock(),
}));

jest.mock('firebase-admin/extensions', () => ({
  ...jest.requireActual('firebase-admin/extensions'),
  getExtensions: () => getExtensionsMock(),
}));

jest.mock('../src/config', () => ({
  default: {
    table: '',
    dataset: '',
    datasetLocation: 'us',
    collectionName: '27062023',
    runInitialBackup: true,
    bucketName: 'dev-extensions-testing.appspot.com',
  },
}));

/** Setup project config */
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
process.env.PUBSUB_EMULATOR_HOST = '127.0.0.1:8085';
process.env.GOOGLE_CLOUD_PROJECT = 'demo-test';
process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';

/** Global vars */

describe('backupDatabase', () => {
  test('Can backup database', async () => {
    /** Run the function */
    await runInitialSetup();
  });
});
