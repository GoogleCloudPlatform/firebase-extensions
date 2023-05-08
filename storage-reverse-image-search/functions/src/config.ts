import {AlgorithmConfig} from './types/algorithm_config';

export default {
  // System vars
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,

  // User-defined vars

  path: process.env.IMG_PATH,
  modelUrl: process.env.MODEL_URL!,
  imgBucket: process.env.IMG_BUCKET!,
  neighbors: parseInt(process.env.N_COUNT!),
  batchSize: parseInt(process.env.BATCH_SIZE!),
  distanceMeasureType: process.env.DISTANCE_MEASURE!,
  algorithmConfig: process.env.ALGORITHM_CONFIG! as AlgorithmConfig,
  inputShape: parseInt(process.env.INPUT_SHAPE!.split(',')[0]),
  bucketName: `${process.env.PROJECT_ID!}-ext-${process.env.EXT_INSTANCE_ID!}`,
  featureNormType:
    process.env.DISTANCE_MEASURE === 'COSINE_DISTANCE'
      ? 'UNIT_L2_NORM'
      : 'NONE',

  // Extension-specific vars
  tasksDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/tasks`,
  metadataDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/metadata`,
};
