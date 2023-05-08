
process.env.LOCATION = 'test-location';
process.env.PROJECT_ID = 'test-project-id';
process.env.EXT_INSTANCE_ID = 'test-instance-id';
process.env.COLLECTION_NAME = 'test-collection-name';
process.env.EMBEDDING_METHOD = 'test-embedding-method';
process.env.DISTANCE_MEASURE = 'test-distance-measure';
process.env.FIELDS = 'test-fields';
process.env.ALGORITHM_CONFIG = 'test-algorithm-config';

const config = require('../src/config').default;

describe('Config object tests', () => {
    test('location should be defined', () => {
        expect(config.location).toBeDefined();
        expect(typeof config.location).toBe('string');
        expect(config.location).toBe('test-location');
    });

    test('projectId should be defined', () => {
        expect(config.projectId).toBeDefined();
        expect(typeof config.projectId).toBe('string');
        expect(config.projectId).toBe('test-project-id');
    });

    test('instanceId should be defined', () => {
        expect(config.instanceId).toBeDefined();
        expect(typeof config.instanceId).toBe('string');
        expect(config.instanceId).toBe('test-instance-id');
    });

    test('distanceMeasureType should be defined', () => {
        expect(config.distanceMeasureType).toBeDefined();
        expect(typeof config.distanceMeasureType).toBe('string');
        expect(config.distanceMeasureType).toBe('test-distance-measure');
    });

    test('algorithmConfig should be defined', () => {
        expect(config.algorithmConfig).toBeDefined();
        expect(typeof config.algorithmConfig).toBe('string');
        expect(config.algorithmConfig).toBe('test-algorithm-config');
    });

    test('bucketName should be defined', () => {
        expect(config.bucketName).toBeDefined();
        expect(typeof config.bucketName).toBe('string');
        expect(config.bucketName).toBe('test-project-id-ext-test-instance-id');
    });

    test('tasksDoc should be defined', () => {
        expect(config.tasksDoc).toBeDefined();
        expect(typeof config.tasksDoc).toBe('string');
        expect(config.tasksDoc).toBe('_ext-test-instance-id/tasks');
    });

    test('metadataDoc should be defined', () => {
        expect(config.metadataDoc).toBeDefined();
        expect(typeof config.metadataDoc).toBe('string');
        expect(config.metadataDoc).toBe('_ext-test-instance-id/metadata');
    });
});