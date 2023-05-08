import { chunkArray } from "../../src/common/utils";

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

describe("chunkArray", () => {

    test("should handle empty arrays", async () => {
        const inputArray = [];
        const batchSize = 2;
        const expectedResult = [];

        expect(chunkArray(inputArray, batchSize)).toEqual(expectedResult);
    })
    test("should chunk the input array into smaller arrays of specified size", () => {
        const inputArray = [1, 2, 3, 4, 5, 6];
        const chunkSize = 2;
        const expectedResult = [
            [1, 2],
            [3, 4],
            [5, 6],
        ];

        expect(chunkArray(inputArray, chunkSize)).toEqual(expectedResult);
    })

    test("should handle arrays with length not divisible by chunk size", () => {
        const inputArray = [1, 2, 3, 4, 5, 6, 7];
        const chunkSize = 3;
        const expectedResult = [
            [1, 2, 3],
            [4, 5, 6],
            [7],
        ];

        expect(chunkArray(inputArray, chunkSize)).toEqual(expectedResult);
    });

    test("should return an empty array when given an empty array", () => {
        const inputArray: number[] = [];
        const chunkSize = 3;

        expect(chunkArray(inputArray, chunkSize)).toEqual([]);
    });

    test("should return the original array as a single chunk for chunkSize equal to or greater than the array length", () => {
        const inputArray = [1, 2, 3, 4, 5, 6];
        const chunkSize = 6;
        const expectedResult = [[1, 2, 3, 4, 5, 6]];

        expect(chunkArray(inputArray, chunkSize)).toEqual(expectedResult);
    });

    test("should handle chunk sizes of 1", () => {
        const inputArray = [1, 2, 3, 4, 5];
        const chunkSize = 1;
        const expectedResult = [[1], [2], [3], [4], [5]];

        expect(chunkArray(inputArray, chunkSize)).toEqual(expectedResult);
    });

});