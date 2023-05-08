import { getProjectNumber } from "../../src/common/utils";

const mockGetClient = jest.fn();
const mockCloudResourceManager = jest.fn();
const mockProjectsGet = jest.fn();

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

jest.mock("googleapis", () => {
    return {
        google: {
            auth: {
                getClient: (args: unknown) => mockGetClient(args)
            },
            cloudresourcemanager: (args: unknown) => {
                mockCloudResourceManager(args)
                return {
                    projects: {
                        get: (args: unknown) => mockProjectsGet(args)
                    },
                };
            },
        }
    };
});

describe("getProjectNumber", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("should return the project number for a valid project ID", async () => {
        const projectId = "test-project";
        const projectNumber = "123456789";

        mockGetClient.mockResolvedValueOnce("mock_auth_client");
        mockProjectsGet.mockResolvedValueOnce({
            data: { projectNumber },
        });

        const result = await getProjectNumber(projectId);

        expect(result).toBe(projectNumber);
        expect(mockGetClient).toHaveBeenCalledWith({
            scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        });
    })
})