import {createIndexTrigger} from '../../src/index';
import * as admin from 'firebase-admin';
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../../src/config';

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'dev-extensions-testing',
    instanceId: 'test-instance',

    // User-defined vars
    path: 'images',
    modelUrl: 'test-model-url',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 256,
    bucketName: 'dev-extensions-testing-ext-test-instance',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
  },
}));

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'dev-extensions-testing',
    instanceId: 'test-instance',

    // User-defined vars
    path: 'images',
    modelUrl: 'test-model-url',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 256,
    bucketName: 'dev-extensions-testing-ext-test-instance',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
  },
}));

const fft = firebaseFunctionsTest({
  projectId: 'dev-extensions-testing',
});

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const mockCreateIndex = jest.fn();

jest.mock('../../src/common/vertex', () => ({
  createIndex: (args: unknown) => {
    mockCreateIndex(args);
    return 'mock operation';
  },
}));

const wrappedCreateIndexTrigger = fft.wrap(createIndexTrigger);

const firestoreObserver = jest.fn();

describe('createIndex', () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(async () => {
    jest.resetAllMocks();
    firestoreObserver.mockReset();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/dev-extensions-testing/databases/(default)/documents`,
      {method: 'DELETE'}
    );
    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(config.tasksDoc.split('/')[0])
      .onSnapshot(snap => {
        firestoreObserver(snap);
      });
  });

  afterEach(async () => {
    if (unsubscribe) {
      unsubscribe();
    }

    jest.resetAllMocks();
    firestoreObserver.mockReset();

    /** clear collections */
    admin.firestore().doc(config.tasksDoc).delete();
    admin.firestore().doc(config.metadataDoc).delete();
  });
  test('should not run if no status', async () => {
    const notTask = {
      notStatus: 'test',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);

    await ref.create(notTask);

    const beforeSnapshot = fft.firestore.makeDocumentSnapshot({}, ref.path);

    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );

    expectNoOp();
  });

  test('should not run if status is unchanged', async () => {
    const notTask = {
      status: 'DONE',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);

    await ref.create(notTask);

    const beforeSnapshot = fft.firestore.makeDocumentSnapshot({}, ref.path);

    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );

    expectNoOp();
  });

  test('should not run if status is changed, but no output shape', async () => {
    const taskBefore = {
      status: 'PENDING',
    };
    const taskWithoutShape = {
      status: 'DONE',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);

    await ref.create(taskWithoutShape);

    const beforeSnapshot = fft.firestore.makeDocumentSnapshot(
      taskBefore,
      ref.path
    );

    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );

    expectNoOp();
  });

  test('should not run if status is changed, and output shape is present but not a number', async () => {
    const taskBefore = {
      status: 'PENDING',
    };
    const taskWithoutShape = {
      status: 'DONE',
      outputShape: 'not a number',
    };

    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);
    await ref.create(taskWithoutShape);
    const beforeSnapshot = fft.firestore.makeDocumentSnapshot(
      taskBefore,
      ref.path
    );
    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );
    expect(firestoreObserver).toHaveBeenCalledTimes(1);
  });

  test('should run if status is changed, and output shape is present and is a number', async () => {
    const taskBefore = {
      status: 'PENDING',
    };
    const taskWithoutShape = {
      status: 'DONE',
      outputShape: 100,
    };

    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);
    await ref.create(taskWithoutShape);
    const beforeSnapshot = fft.firestore.makeDocumentSnapshot(
      taskBefore,
      ref.path
    );
    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );

    expect(firestoreObserver).toHaveBeenCalledTimes(2);
  });
});

type DocumentReference = admin.firestore.DocumentReference;
type DocumentData = admin.firestore.DocumentData;
type DocumentSnapshot = admin.firestore.DocumentSnapshot<DocumentData>;

const simulateFunctionTriggered =
  (wrappedFunction: any) =>
  async (ref: DocumentReference, before?: DocumentSnapshot) => {
    const data = (await ref.get()).data() as {[key: string]: any};
    const beforeFunctionExecution = fft.firestore.makeDocumentSnapshot(
      data,
      ref.path
    ) as DocumentSnapshot;
    const change = fft.makeChange(before, beforeFunctionExecution);
    await wrappedFunction(change);
    return beforeFunctionExecution;
  };

const expectNoOp = () => {
  expect(firestoreObserver).toHaveBeenCalledTimes(1);
};
