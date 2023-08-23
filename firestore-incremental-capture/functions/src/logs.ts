import { logger } from "firebase-functions";

export const bigQueryDatasetExists = (dataset: string) => {
  logger.log(`${dataset} already exists`);
};

export const bigQueryTableExists = (dataset: string) => {
  logger.log(`${dataset} already exists`);
};

export const bigQueryDatasetCreating = (dataset: string) => {
  logger.log(`Creating dataset: ${dataset}`);
};

export const bigQueryTableCreating = (table: string) => {
  logger.log(`Creating table: ${table}`);
};

export const bigQueryDatasetCreated = (dataset: string) => {
  logger.log(`successfully created dataset: ${dataset}`);
};

export const bigQueryTableCreated = (table: string) => {
  logger.log(`successfully created table: ${table}`);
};

export const tableCreationError = (table: string) => {
  logger.log(`error creating table: ${table}`);
};

export const datasetCeationError = (dataset: string) => {
  logger.log(`error creatign dataset: ${dataset}`);
};
