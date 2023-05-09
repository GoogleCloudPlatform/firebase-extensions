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

import {v3} from '@google-cloud/resource-manager';
import * as functions from 'firebase-functions';

import config from '../config';

// Instantiates a client
const resourcemanagerClient = new v3.OrganizationsClient({
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/cloudplatformprojects',
  ],
});

// requires the following permissions:
// - resourcemanager.projects.setIamPolicy
// - resourcemanager.projects.getIamPolicy
// https://cloud.google.com/iam/docs/understanding-roles#resourcemanager.projectIamAdmin

export async function enableAuditLogsVertexAI(): Promise<void> {
  // Set the project ID and the parent resource
  const projectId = config.projectId;
  const parent = `projects/${projectId}`;

  // Set the audit log config for Vertex AI API
  const auditLogConfig = {
    service: 'aiplatform.googleapis.com',
    logTypes: ['DATA_READ', 'DATA_WRITE'],
  };

  try {
    const response = await resourcemanagerClient.getIamPolicy({
      resource: parent,
    });

    functions.logger.log('Audit logs response', response);

    if (!response[0].bindings) {
      response[0].auditConfigs = [auditLogConfig];
    } else {
      const policyExists = response[0].auditConfigs?.find(
        auditConfig => auditConfig.service === 'aiplatform.googleapis.com'
      );

      if (policyExists) {
        functions.logger.info(
          'Audit logs already enabled for Vertex AI API, skipping.'
        );
        return;
      }

      response[0].auditConfigs = [auditLogConfig];
    }

    const request = {
      resource: parent,
      requestBody: {
        policy: response[0],
      },
    };

    await resourcemanagerClient.setIamPolicy(request);
    functions.logger.log('Audit logs is now enabled for Vertex AI API.');
  } catch (error) {
    functions.logger.error(
      'Error enabling audit logs for Vertex AI API',
      error
    );
    throw error;
  }
}
