import {storage} from 'firebase-admin';
import config from './config';
// import * as logs from './logs';
import {Dataset} from '@google-cloud/bigquery';

import {BigQuery} from '@google-cloud/bigquery';

const bq = new BigQuery({projectId: config.projectId});

function bigqueryDataset(databaseId: string) {
  return bq.dataset(databaseId, {
    location: config.bigqueryDatasetLocation,
  });
}

async function initializeDataset(databaseId: string) {
  let dataset: Dataset = bigqueryDataset(databaseId);
  const [datasetExists] = await dataset.exists();

  if (datasetExists) {
    // logs.bigQueryDatasetExists(databaseId);
    return dataset;
  }

  /** Create table if does not exisst */
  try {
    // logs.bigQueryDatasetCreating(databaseId);
    [dataset] = await bq.createDataset(databaseId, {
      location: config.bigqueryDatasetLocation,
    });
    // logs.bigQueryDatasetCreated(databaseId);
    return dataset;
  } catch (ex: any) {
    // logs.datasetCeationError(databaseId);
    return dataset;
  }
}
