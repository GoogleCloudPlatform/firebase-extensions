import * as admin from 'firebase-admin';
import config from '../config';
import {logger} from 'firebase-functions/v1';

export async function onCompleteHandler(payload: any) {
  logger.info('build event completed!');
  logger.info(`Message: ${JSON.stringify(payload)}`);

  await admin
    .firestore()
    .doc(config.cloudBuildDoc)
    .update({status: 'staged', ...payload});
}
