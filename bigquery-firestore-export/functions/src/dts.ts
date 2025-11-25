/**
 * Copyright 2025 Google LLC
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

import config from './config';
import * as bigqueryDataTransfer from '@google-cloud/bigquery-data-transfer';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mapValues = require('lodash.mapvalues');
import * as logs from './logs';
import {Config} from './types';

import * as functions from 'firebase-functions';

// Error message constants for partitioning field removal
export const PARTITIONING_FIELD_REMOVAL_ERROR_PREFIX =
  'Cannot remove partitioning_field from an existing transfer config';
export const PARTITIONING_FIELD_REMOVAL_ERROR =
  'Cannot remove partitioning_field from an existing transfer config. The BigQuery Data Transfer API does not support clearing this parameter once it has been set. To change partitioning, you must create a new transfer config with the desired partitioning settings.';

export const getTransferConfig = async (transferConfigName: string) => {
  try {
    const datatransferClient =
      new bigqueryDataTransfer.v1.DataTransferServiceClient({
        projectId: config.projectId,
      });
    const request = {name: transferConfigName};
    const response = await datatransferClient.getTransferConfig(request);

    return response[0];
  } catch (e) {
    functions.logger.error(`Failed to get transfer config: ${e}`);
    return null;
  }
};

export const createTransferConfigRequest = (config: Config) => {
  const params = {
    query: config.queryString,
    destination_table_name_template: `${config.tableName}_{run_time|"%H%M%S"}`,
    write_disposition: 'WRITE_TRUNCATE',
    partitioning_field: config.partitioningField || '',
  };
  const transferConfigParams = mapValues(
    params,
    (value: boolean | number | string) => {
      const error = Error(
        `not implemented transfer config parameter type ${typeof value}`
      );
      switch (typeof value) {
        case 'boolean':
          return {boolValue: value};
        case 'number':
          return {numberValue: value};
        case 'string':
          return {stringValue: value};
        default:
          logs.error(error);
          throw error;
      }
    }
  );
  const transferConfig: bigqueryDataTransfer.protos.google.cloud.bigquery.datatransfer.v1.ITransferConfig =
    {
      destinationDatasetId: config.datasetId,
      displayName: config.displayName,
      dataSourceId: 'scheduled_query',
      params: {fields: transferConfigParams},
      schedule: config.schedule,
      notificationPubsubTopic: `projects/${config.projectId}/topics/${config.pubSubTopic}`,
    };

  // Instantiates a client
  const request = {
    parent: `projects/${config.projectId}`,
    transferConfig,
  };
  return request;
};

export const createTransferConfig = async () => {
  const datatransferClient =
    new bigqueryDataTransfer.v1.DataTransferServiceClient({
      projectId: config.projectId,
    });
  const request = createTransferConfigRequest(config);
  // Run request

  // TODO: Should we be converting it?
  //const converted = bigqueryDataTransfer.protos.google.cloud.bigquery.datatransfer.v1.TransferConfig.fromObject(transferConfig);
  logs.createTransferConfig();
  const response = await datatransferClient.createTransferConfig(request);
  //TODO - what if name is null or undefined?
  logs.transferConfigCreated(response[0].name!);
  return response[0];
};

export const constructUpdateTransferConfigRequest = async (
  transferConfigName: string,
  config: Config
) => {
  const transferConfig = await getTransferConfig(transferConfigName);

  if (!transferConfig) {
    throw new Error('Transfer config not found');
  }

  const updateMask = [];
  const updatedConfig = JSON.parse(JSON.stringify(transferConfig));
  //TODO - what if null or undefined?
  if (config.queryString !== transferConfig.params!.fields!.query.stringValue) {
    updateMask.push('params');
    updatedConfig.params.fields.query.stringValue = config.queryString;
  }

  const destinationTableNameTemplate = `${config.tableName}_{run_time|"%H%M%S"}`;
  if (
    destinationTableNameTemplate !==
    //TODO - what if null or undefined?
    transferConfig.params!.fields!.destination_table_name_template.stringValue
  ) {
    updateMask.push('params');
    updatedConfig.params.fields.destination_table_name_template.stringValue =
      destinationTableNameTemplate;
  }

  // Only update partitioning_field if it has a non-empty value
  // BigQuery Data Transfer API rejects empty/undefined values for this parameter on update
  const existingPartitioningField =
    transferConfig.params!.fields!.partitioning_field?.stringValue || '';
  const newPartitioningField = config.partitioningField || '';

  if (newPartitioningField !== existingPartitioningField) {
    // Only include in update if the new value is non-empty
    if (newPartitioningField) {
      updateMask.push('params');
      // Initialize partitioning_field if it doesn't exist (e.g., config created without it)
      if (!updatedConfig.params.fields.partitioning_field) {
        updatedConfig.params.fields.partitioning_field = {};
      }
      updatedConfig.params.fields.partitioning_field.stringValue =
        newPartitioningField;
    } else {
      // If new value is empty and old value was non-empty, throw error
      // The BigQuery Data Transfer API does not support clearing this parameter
      logs.partitioningFieldRemovalAttempted(
        transferConfigName,
        existingPartitioningField
      );
      throw new Error(PARTITIONING_FIELD_REMOVAL_ERROR);
    }
  }

  if (config.schedule !== transferConfig.schedule) {
    updateMask.push('schedule');
    updatedConfig.schedule = config.schedule;
  }

  const request = {
    transferConfig: updatedConfig,
    updateMask: {paths: updateMask},
    name: transferConfig.name,
  };

  return request;
};

export const updateTransferConfig = async (transferConfigName: string) => {
  try {
    const datatransferClient =
      new bigqueryDataTransfer.v1.DataTransferServiceClient({
        projectId: config.projectId,
      });
    const request = await constructUpdateTransferConfigRequest(
      transferConfigName,
      config
    );

    // Run request
    logs.updateTransferConfig(transferConfigName);
    const converted =
      bigqueryDataTransfer.protos.google.cloud.bigquery.datatransfer.v1.UpdateTransferConfigRequest.fromObject(
        request
      );

    const response = await datatransferClient.updateTransferConfig(converted);
    logs.transferConfigUpdated(transferConfigName);
    return response[0];
  } catch (e) {
    // Re-throw partitioning removal errors so they can be handled specifically
    if (
      e instanceof Error &&
      e.message.includes(PARTITIONING_FIELD_REMOVAL_ERROR_PREFIX)
    ) {
      throw e;
    }
    functions.logger.error(`Error updating transfer config: ${e}`);
    return null;
  }
};
