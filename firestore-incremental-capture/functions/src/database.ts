import * as admin from 'firebase-admin';
import config from './config';
import {logger} from 'firebase-functions/v1';

export const updateStatus = (id: string, data: any) => {
  /** log update */
  logger.info(`Updating status for ${id}`, data);

  /** Get the onfigured collection */
  const collection = admin.firestore().collection(config.statusCollectionName);

  /** Get the status document */
  const document = collection.doc(`${id}`);

  /** Update the document */
  return document.set({...data}, {merge: true});
};
