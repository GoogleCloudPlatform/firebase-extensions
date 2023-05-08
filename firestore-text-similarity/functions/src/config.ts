import { AlgorithmConfig } from "./types/algorithm_config";

export default {
  // System vars
  location: process.env.LOCATION!,
  projectId: process.env.PROJECT_ID!,
  instanceId: process.env.EXT_INSTANCE_ID!,

  // User-defined vars
  doBackfill: process.env.DO_BACKFILL === "true",
  neighbors: parseInt(process.env.N_COUNT!),
  palmModel: process.env.PALM_EMBEDDING_MODEL!,
  collectionName: process.env.COLLECTION_NAME!,
  embeddingMethod: process.env.EMBEDDING_METHOD!,
  distanceMeasureType: process.env.DISTANCE_MEASURE!,
  fields: Array.from(process.env.FIELDS?.split(",") ?? []),
  algorithmConfig: process.env.ALGORITHM_CONFIG! as AlgorithmConfig,
  featureNormType:
    process.env.DISTANCE_MEASURE === "COSINE_DISTANCE"
      ? "UNIT_L2_NORM"
      : "NONE",

  // Extension-specific vars
  tasksDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/tasks`,
  metadataDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/metadata`,
  dimension: process.env.EMBEDDING_METHOD === "palm" ? 768 : 512,
  bucketName: `${process.env.PROJECT_ID!}-ext-${process.env.EXT_INSTANCE_ID!}`,
};
