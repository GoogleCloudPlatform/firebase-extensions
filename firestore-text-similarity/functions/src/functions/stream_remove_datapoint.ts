import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import {getFunctions} from 'firebase-admin/functions';

import config from '../config';
import {AxiosError} from 'axios';
import {IndexStatus} from '../types/index_status';
import {checkIndexStatus, removeDatapoint} from '../common/vertex';

export async function streamRemoveDatapointHandler(
  snap: FirebaseFirestore.DocumentSnapshot
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
        docId: snap.id,
      },
      {
        scheduleDelaySeconds: 60 * 60,
      }
    );
    return;
  }

  try {
    // Get the index name from the metadata document.
    const metdata = await admin.firestore().doc(config.metadataDoc).get();
    const index = metdata.data()?.index;
    if (!index) {
      functions.logger.error('Index not found');
      return;
    }

    functions.logger.info(`Removing datapoint ${snap.id}`);

    try {
      await removeDatapoint(index, [snap.id]);
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
