/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
  doBackfill: process.env.DO_BACKFILL === 'true',
  distanceMeasureType: process.env.DISTANCE_MEASURE!,
  algorithmConfig: process.env.ALGORITHM_CONFIG! as AlgorithmConfig,
  inputShape: parseInt(process.env.INPUT_SHAPE!.split(',')[0]),
  bucketName: `${process.env.PROJECT_ID!}-ext-${process.env.EXT_INSTANCE_ID!}`,
  featureNormType:
    process.env.DISTANCE_MEASURE === 'COSINE_DISTANCE'
      ? 'UNIT_L2_NORM'
      : 'NONE',
  shardSize: process.env.SHARD_SIZE!,
  machineType: process.env.MACHINE_TYPE!,
  acceleratorType: process.env.ACCELERATOR_TYPE!,
  acceleratorCount: parseInt(process.env.ACCELERATOR_COUNT!),
  minReplicaCount: parseInt(process.env.MIN_REPLICA_COUNT!),
  maxReplicaCount: parseInt(process.env.MAX_REPLICA_COUNT!),

  // Extension-specific vars
  tasksDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/tasks`,
  metadataDoc: `_ext-${process.env.EXT_INSTANCE_ID!}/metadata`,
};
