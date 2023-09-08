import {createIndexTrigger} from '../../src/index';
import * as admin from 'firebase-admin';
import * as firebaseFunctionsTest from 'firebase-functions-test';
import config from '../../src/config';

jest.mock('config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',

    // User-defined vars
    collectionName: 'test-collection',
    embeddingMethod: 'use',
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    featureNormType: 'NONE',
    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
    dimensions: 512,
    bucketName: 'demo-gcp-ext-test-instance',
  },
}));

const fft = firebaseFunctionsTest({
  projectId: 'demo-gcp',
});

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const mockCreateIndex = jest.fn();

jest.mock('../../src/common/vertex', () => ({
  createIndex: (args: unknown) => {
    mockCreateIndex(args);
    return 'mock operation';
  },
}));

// admin.initializeApp({
//     projectId: "demo-gcp",
// });

const wrappedCreateIndexTrigger = fft.wrap(createIndexTrigger);

const firestoreObserver = jest.fn();

describe('createIndex', () => {
  let unsubscribe: (() => void) | undefined;

  beforeEach(async () => {
    jest.resetAllMocks();
    firestoreObserver.mockReset();
    await fetch(
      `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-gcp/databases/(default)/documents`,
      {method: 'DELETE'}
    );

    /** Wait two seconds to clear */
    await new Promise(resolve => setTimeout(resolve, 2000));

    // set up observer on collection
    unsubscribe = admin
      .firestore()
      .collection(config.tasksDoc.split('/')[0])
      .onSnapshot(snap => {
        /** There is a bug on first init and write, causing the the emulator to the observer is called twice
         * A snapshot is registered on the first run, this affects the observer count
         * This is a workaround to ensure the observer is only called when it should be
         */
        if (!snap.empty) firestoreObserver(snap);
      });
  });

  afterEach(() => {
    if (unsubscribe) {
      unsubscribe();
    }
    jest.resetAllMocks();
    jest.clearAllMocks();
    firestoreObserver.mockReset();
    firestoreObserver.mockClear();
  });
  xtest('should not run if no status', async () => {
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

  xtest('should not run if status is unchanged', async () => {
    const taskBefore = {
      status: 'PENDING',
    };
    const taskWithoutShape = {
      status: 'PENDING',
    };
    // Make a write to the collection. This won't trigger our wrapped function as it isn't deployed to the emulator.
    const ref = admin.firestore().doc(config.tasksDoc);

    await ref.create(taskBefore);

    const beforeSnapshot = fft.firestore.makeDocumentSnapshot({}, ref.path);

    await simulateFunctionTriggered(wrappedCreateIndexTrigger)(
      ref,
      beforeSnapshot
    );

    expectNoOp();
  });

  xtest('should run if status is changed', async () => {
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
