// can't wrap an onDispatch handler with fft, so we will call the actual function.
import { backfillEmbeddingsTaskHandler } from '../../src/functions/backfill_embeddings_task';
import * as admin from "firebase-admin";
import config from "../../src/config";

const mockUploadToCloudStorage = jest.fn();
const mockSaveEmbeddingsToTmpFile = jest.fn();
const mockDeleteTempFiles = jest.fn();

jest.mock("utils", () => ({
    saveEmbeddingsToTmpFile: (args: unknown) => mockSaveEmbeddingsToTmpFile(args),
    uploadToCloudStorage: (args: unknown) => mockUploadToCloudStorage(args),
    deleteTempFiles: (args: unknown) => mockDeleteTempFiles(args),
}))


//mock functions logger
const mockLogger = jest.fn();
jest.mock("firebase-functions", () => ({
    logger: {
        info: (args: unknown) => mockLogger(args),
    }
}));

jest.mock("config", () => ({
    default: {
        // System vars
        location: "us-central1",
        projectId: "dev-extensions-testing",
        instanceId: "test-instance",

        // User-defined vars
        collectionName: "test-collection",
        embeddingMethod: "use",
        distanceMeasureType: "DOT_PRODUCT_DISTANCE",
        algorithmConfig: "treeAhConfig",
        featureNormType: "NONE",
        // Extension-specific vars
        tasksDoc: `_ext-test-instance/tasks`,
        metadataDoc: `_ext-test-instance/metadata`,
        dimensions: 512,
        bucketName: `dev-extensions-testing-ext-test-instance`,
    }
}));

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.STORAGE_EMULATOR_HOST = "127.0.0.1:9199";
admin.initializeApp({
    projectId: "dev-extensions-testing",
})

describe('onIndexDeployed', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await fetch(
            `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/dev-extensions-testing/databases/(default)/documents`,
            { method: "DELETE" }
        );
    });

    test("should not run if no docs", async () => {

        const id = "test-id";

        const taskRef = admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`);


        await taskRef.set({
            status: "TEST",
        });
        const taskDoc = admin.firestore().doc(config.tasksDoc);
        await taskDoc.set({
            totalLength: 0,
            processedLength: 0,
        });
        const metadataDoc = admin.firestore().doc(config.metadataDoc);
        await metadataDoc.set({
        });

        await backfillEmbeddingsTaskHandler({
            id,
            collectionName: "test-collection",
            documentIds: []
        });

        expect(mockLogger).toHaveBeenCalledTimes(1);
        expect(mockLogger).toHaveBeenCalledWith("No document ids found, skipping...");
    }, 10000);
});