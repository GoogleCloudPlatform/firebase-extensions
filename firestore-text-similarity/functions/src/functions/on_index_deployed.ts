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

import * as functionsv2 from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

import config from '../config';
import {IndexStatus} from '../types/index_status';
import {getDeployedIndex} from '../common/vertex';
import {FieldValue} from 'firebase-admin/firestore';

export const onIndexDeployedConfig = {
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
export async function onIndexDeployedHandler(event: any) {
  try {
    const {protoPayload, operation} = event.data;

    functionsv2.logger.info('EVENT RECEIVED', event);

    if (!operation) return;

    // Check if the operation is the last one, which means the index is ready.
    if (operation && !operation.last) return;

    const endpoint = await getDeployedIndex(protoPayload.resourceName);

    // Add the index endpoint to the metadata document.
    await admin
      .firestore()
      .doc(config.metadataDoc)
      .update({
        operation: FieldValue.delete(),
        status: IndexStatus.DEPLOYED,
        publicEndpointDomainName: `${endpoint}`,
      });
  } catch (error) {
    functionsv2.logger.error(error);
  }
}
