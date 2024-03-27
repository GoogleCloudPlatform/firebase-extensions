import config from './config';
import * as bigqueryDataTransfer from '@google-cloud/bigquery-data-transfer';
const mapValues = require('lodash.mapvalues');
import * as logs from './logs';
import {Config} from './types';

import * as functions from 'firebase-functions';

export const getTransferConfig = async (transferConfigName: string) => {
  try {
    const datatransferClient =
      new bigqueryDataTransfer.v1.DataTransferServiceClient();
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
    (value: boolean | number | string | unknown) => {
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
  const transferConfig = {
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
    new bigqueryDataTransfer.v1.DataTransferServiceClient();
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

  if (
    config.partitioningField !==
    //TODO - what if null or undefined?
    transferConfig.params!.fields!.partitioning_field.stringValue
  ) {
    updateMask.push('params');
    updatedConfig.params.fields.partitioning_field.stringValue =
      config.partitioningField;
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
      new bigqueryDataTransfer.v1.DataTransferServiceClient();
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
    functions.logger.error(`Error updating transfer config: ${e}`);
    return null;
  }
};
