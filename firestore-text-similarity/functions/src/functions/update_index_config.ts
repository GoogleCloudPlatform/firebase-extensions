import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import config from '../config';

import {updateIndex} from '../common/vertex';
import {IndexStatus} from '../types/index_status';

export async function updateIndexConfigHandler() {
  try {
    // get the index config from the database
    const meatdataDoc = admin.firestore().doc(config.metadataDoc);
    const metdata = await meatdataDoc.get();
    const {index, status} = metdata.data() as {
      index: string;
      status: IndexStatus;
    };

    if (status !== IndexStatus.DEPLOYED || !index) {
      throw new Error(`Index ${index} is not deployed or does not exist.`);
    }

    await meatdataDoc.update({
      status: IndexStatus.UPDATING,
    });

    functions.logger.info(`Updating index ${index}...`);
    functions.logger.info(config);

    await updateIndex(index);
    functions.logger.info(`Index ${index} updated.`);

    await meatdataDoc.update({
      status: IndexStatus.DEPLOYED,
    });
  } catch (error) {
    functions.logger.error(error);
    throw error;
  }
}
