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

import * as admin from 'firebase-admin';
import * as functionsv2 from 'firebase-functions/v2';

import config from '../config';
import {IndexStatus} from '../types/index_status';
import {
  createIndexEndpoint,
  deployIndex,
  getOperationByName,
} from '../common/vertex';

export const onIndexCreatedConfig = {
  retry: false,
  eventType: 'google.cloud.audit.log.v1.written',
  serviceAccount: `ext-${config.instanceId}@${config.projectId}.iam.gserviceaccount.com`,
};

/**
 * Triggered when a new index is created, deploys the index to the index endpoint.
 *
 * @param event Cloud Audit Log event.
 * @returns {void}
 */
export async function onIndexCreatedHandler(event: any) {
  try {
    const maxRetries = 5;

    const {operation} = event.data;

    functionsv2.logger.info('EVENT RECEIVED', event);

    if (!operation) return;

    // Check if the operation is the last one, which means the index is ready.
    if (operation && !operation.last) return;

    const _operation = await getOperationByName(operation.id);

    // Check if the operation failed.
    if (_operation.error) {
      functionsv2.logger.error(_operation.error);
      functionsv2.logger.error(_operation.metadata);
      functionsv2.logger.error(_operation);

      throw new Error(_operation.error?.message ?? 'Unknown error.');
    }

    const indexResourceName = (operation.id as string).split('/operations/')[0];

    functionsv2.logger.info('Index created!', {
      indexResourceName,
    });

    const indexEndpointOp = await createIndexEndpoint();

    // Poll the operation until it's done.
    for (let i = 0; i < maxRetries; i++) {
      if (indexEndpointOp.done) {
        break;
      } else if (indexEndpointOp.error) {
        throw indexEndpointOp.error;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const indexEndpoint = await indexEndpointOp.promise();
    functionsv2.logger.info(indexEndpoint);

    if (!indexEndpoint[0].name)
      throw new Error('Index endpoint name is undefined.');

    try {
      const indexEndpointResourceName = indexEndpoint[0].name;

      await deployIndex(indexEndpointResourceName, indexResourceName);

      functionsv2.logger.info('Index is being deployed.');

      // Add the index endpoint to the metadata document.
      await admin.firestore().doc(config.metadataDoc).update({
        index: indexResourceName,
        status: IndexStatus.DEPLOYING,
        indexEndpoint: indexEndpoint[0].name,
      });

      return;
    } catch (error) {
      functionsv2.logger.error(error);
      throw error;
    }
  } catch (error) {
    functionsv2.logger.error(error);
  }
}
