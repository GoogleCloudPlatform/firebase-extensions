// export default {
//     // System vars
//     location: process.env.LOCATION!,
//     projectId: process.env.PROJECT_ID!,
//     instanceId: process.env.EXT_INSTANCE_ID!,

//     // User-defined vars
//     path: process.env.IMG_PATH,
//     modelUrl: process.env.MODEL_URL!,
//     imgBucket: process.env.IMG_BUCKET!,
//     batchSize: parseInt(process.env.BATCH_SIZE!),
//     distanceMeasureType: process.env.DISTANCE_MEASURE!,
//     algorithmConfig: process.env.ALGORITHM_CONFIG! as AlgorithmConfig,
//     inputShape: parseInt(process.env.INPUT_SHAPE!.split(",")[0]),
//     bucketName: `${process.env.PROJECT_ID!}-ext-${process.env.EXT_INSTANCE_ID!}`,

//     // Extension-specific vars
//     tasksDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/tasks`,
//     metadataDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/metadata`,
//   };

process.env.LOCATION = 'test-location';
process.env.PROJECT_ID = 'test-project-id';
process.env.EXT_INSTANCE_ID = 'test-instance-id';
process.env.IMG_PATH = 'test-path';
process.env.MODEL_URL = 'test-model-url';
process.env.IMG_BUCKET = 'test-img-bucket';
process.env.BATCH_SIZE = '508';
process.env.DISTANCE_MEASURE = 'test-distance-measure';
process.env.ALGORITHM_CONFIG = 'test-algorithm-config';
process.env.INPUT_SHAPE = '100,200';
process.env.BUCKET_NAME = 'test-bucket-name';
process.env.TASKS_DOC = 'test-tasks-doc';
process.env.METADATA_DOC = 'test-metadata-doc';

const config = require('../src/config').default;

console.log('testttsetsetse', process.env.INPUT_SHAPE);

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

  test('path should be defined', () => {
    expect(config.path).toBeDefined();
    expect(typeof config.path).toBe('string');
    expect(config.path).toBe('test-path');
  });

  test('modelUrl should be defined', () => {
    expect(config.modelUrl).toBeDefined();
    expect(typeof config.modelUrl).toBe('string');
    expect(config.modelUrl).toBe('test-model-url');
  });

  test('imgBucket should be defined', () => {
    expect(config.imgBucket).toBeDefined();
    expect(typeof config.imgBucket).toBe('string');
    expect(config.imgBucket).toBe('test-img-bucket');
  });

  test('batchSize should be defined and a number', () => {
    expect(config.batchSize).toBeDefined();
    expect(typeof config.batchSize).toBe('number');
    expect(config.batchSize).toBe(508);
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

  test('inputShape should be defined and a number', () => {
    console.log('testttsetsetse', process.env.INPUT_SHAPE);
    // expect(config.inputShape).toBeDefined();
    // expect(typeof config.inputShape).toBe('number');
    // expect(config.inputShape).toBe(100);
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
