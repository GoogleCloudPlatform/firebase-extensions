import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {getFunctions} from 'firebase-admin/functions';

import config from '../config';
import {AxiosError} from 'axios';
import * as utils from '../common/utils';
import {IndexStatus} from '../types/index_status';
import {checkIndexStatus, removeDatapoint} from '../common/vertex';

export async function streamRemoveDatapointHandler(
  object: functions.storage.ObjectMetadata
) {
  const indexStatus = await checkIndexStatus();
  if (indexStatus !== IndexStatus.DEPLOYED) {
    functions.logger.info('Index not deployed yet, skipping...');
    const queue = getFunctions().taskQueue(
      'datapointWriteTask',
      config.instanceId
    );

    // Index isn't ready yet, retry in an hour.
    await queue.enqueue(
      {
        operation: 'remove',
        imagePath: object.name,
      },
      {
        scheduleDelaySeconds: 60 * 60,
      }
    );
    return;
  }

  if (!object.name) return;
  if (!utils.isImage(object.name)) {
    functions.logger.info(`Skipping ${object.name}, not an image...`);
    return;
  }

  functions.logger.info(`Processing ${object.name}...`);

  const imagePath = object.name;

  functions.logger.info(`Deleting ${imagePath}`);

  try {
    // Get the index name from the metadata document.
    const metdata = await admin.firestore().doc(config.metadataDoc).get();
    const index = metdata.data()?.index;
    if (!index) {
      functions.logger.error('Index not found');
      return;
    }

    try {
      // Remove a datapoint from the index by its ID.
      await removeDatapoint(index, [imagePath]);
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        functions.logger.error('Index not found, nothing to remove');

        return;
      } else {
        throw error;
      }
    }
  } catch (error) {
    functions.logger.error((error as AxiosError).response);
  }
}
