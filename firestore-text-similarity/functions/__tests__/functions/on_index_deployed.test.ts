import * as firebaseFunctionsTest from "firebase-functions-test";
import { onIndexDeployed } from '../../src/index';
import config from "../../src/config";

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

const fft = firebaseFunctionsTest({
    projectId: "dev-extensions-testing",
    storageBucket: config.bucketName,
});

const mockGetDeployedIndex = jest.fn().mockImplementation(() => "test-index-endpoint.com")

jest.mock("vertex", () => ({
    getDeployedIndex: () => mockGetDeployedIndex(),
}))

const wrappedOnIndexDeployed = fft.wrap(onIndexDeployed);


describe('onIndexDeployed', () => {
    test("should not run if no operation", async () => {

        await wrappedOnIndexDeployed();
        expect(mockGetDeployedIndex).not.toHaveBeenCalled();
    });

    test("should not run if not last operation", async () => {

        wrappedOnIndexDeployed({
            data: {
                operation: {
                    last: false
                }
            }
        });

    });
});