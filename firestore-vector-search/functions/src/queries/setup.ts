/**
 * Copyright 2026 Google LLC
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

import {firestoreAdminClient} from '../config';
import * as functions from 'firebase-functions/v1';

interface CreateIndexOptions {
  collectionName: string;
  dimension: number;
  projectId: string;
  fieldPath: string;
}

const getParent = (options: CreateIndexOptions) =>
  `projects/${options.projectId}/databases/(default)/collectionGroups/${options.collectionName}`;

const getIndex = (options: CreateIndexOptions) => ({
  queryScope: 'COLLECTION' as const,
  fields: [
    {
      fieldPath: options.fieldPath,
      vectorConfig: {
        dimension: options.dimension,
        flat: {},
      },
    },
  ],
});

export async function createIndex(options: CreateIndexOptions) {
  const allIndexes = await firestoreAdminClient.listIndexes({
    parent: getParent(options),
  });
  const indexExists = allIndexes[0].some(index => {
    const hasCollectionName = index.name?.includes(options.collectionName);
    const hasFieldPath = index.fields?.some(
      field => field.fieldPath === options.fieldPath
    );
    return hasCollectionName && hasFieldPath;
  });

  if (indexExists) {
    functions.logger.info('Index already exists, skipping index creation');
    return;
  }

  const result = await firestoreAdminClient.createIndex({
    parent: getParent(options),
    index: getIndex(options),
  });

  functions.logger.info(`Index created: ${JSON.stringify(result)}`);
}

export async function checkCreateIndexProgress(indexName: string) {
  const result = await firestoreAdminClient.getIndex({name: indexName});
  console.log(`Index status: ${JSON.stringify(result)}`);
  return result;
}
