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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import {getFeatureVectors, isBase64Image} from '../common/feature_vectors';
import {queryIndex} from '../common/vertex';
import {Query} from '../types/query';
import {AxiosError} from 'axios';
import config from '../config';

export async function queryIndexHandler(data: any) {
  const {query, neighbours} = data;

  if (!query) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function must be called with ' +
        'one argument "query" containing the query text.'
    );
  }

  if (typeof query === 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The `query` argument must be an array of Base64 strings.'
    );
  }

  if (!Array.isArray(query) || !query.every(isBase64Image)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The `query` argument must be an array of Base64 strings.'
    );
  }

  const queryEmbeddings = await getFeatureVectors(query);
  const neighboursCount = parseInt(neighbours) || 10;

  const metadata = await admin.firestore().doc(config.metadataDoc).get();
  const {publicEndpointDomainName, indexEndpoint} = metadata.data() || {};

  if (!publicEndpointDomainName || !indexEndpoint)
    throw new Error('Endpoint or index endpoint is undefined.');

  try {
    const result = await queryIndex(
      [new Query('0', queryEmbeddings[0])],
      neighboursCount,
      publicEndpointDomainName,
      indexEndpoint.split('/').pop()
    );

    functions.logger.info('Query successful', result);

    return {status: 'ok', message: 'Query successful', data: result};
  } catch (error) {
    const axiosError = error as AxiosError;
    functions.logger.error('Error querying the index', axiosError.message);
    throw new functions.https.HttpsError(
      'internal',
      'Error querying the index',
      axiosError.message
    );
  }
}
