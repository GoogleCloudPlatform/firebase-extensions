import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as functionsv2 from 'firebase-functions/v2';

import config from './config';

import {
  onIndexCreatedConfig,
  onIndexCreatedHandler,
} from './functions/on_index_created';
import {
  onIndexDeployedConfig,
  onIndexDeployedHandler,
} from './functions/on_index_deployed';

import {queryIndexHandler} from './functions/query_index';
import {backfillTriggerHandler} from './functions/backfill_trigger';
import {backfillEmbeddingsTaskHandler} from './functions/backfill_task';
import {createIndexTriggerHandler} from './functions/create_index_trigger';
import {datapointWriteTaskHandler} from './functions/datapoint_write_task';
import {streamUpdateDatapointHandler} from './functions/stream_update_datapoint';
import {streamRemoveDatapointHandler} from './functions/stream_remove_datapoint';

admin.initializeApp();

/**
 * Setup the Matching Engine Index on the first run of the extension.
 */
export const backfillTrigger = functions.tasks
  .taskQueue()
  .onDispatch(backfillTriggerHandler);

/**
 * Backfill the embeddings for a given collection.
 */
export const backfillTask = functions.tasks
  .taskQueue()
  .onDispatch(backfillEmbeddingsTaskHandler);

/**
 * Triggered when a new Index is created.
 */
export const onIndexCreated = functionsv2.eventarc.onCustomEventPublished(
  onIndexCreatedConfig,
  onIndexCreatedHandler
);

/**
 * Triggered when a new Index is deployed.
 */
export const onIndexDeployed = functionsv2.eventarc.onCustomEventPublished(
  onIndexDeployedConfig,
  onIndexDeployedHandler
);

/**
 * Triggered when the tasks document is updated.
 * When backfill is done, this will trigger the index creation.
 */
export const createIndexTrigger = functions.firestore
  .document(config.tasksDoc)
  .onUpdate(createIndexTriggerHandler);

/**
 * Triggered when a new object is uploaded.
 */
export const streamUpdateDatapoint = functions.storage
  .object()
  .onFinalize(streamUpdateDatapointHandler);

/**
 * Triggered when an object is deleted.
 */
export const streamRemoveDatapoint = functions.storage
  .object()
  .onDelete(streamRemoveDatapointHandler);

/**
 * Triggered when a datapoint is written to the collection, but the index isn't yet ready.
 */
export const datapointWriteTask = functions.tasks
  .taskQueue()
  .onDispatch(datapointWriteTaskHandler);

/**
 * Call the Matching Engine Index to query for similar documents.
 */
export const queryIndex = functions.https.onCall(queryIndexHandler);
