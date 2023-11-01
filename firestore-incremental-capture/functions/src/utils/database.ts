import * as admin from 'firebase-admin';
import config from '../config';
import {logger} from 'firebase-functions/v1';

export const updateStatus = (id: string, data: any) => {
  // log update
  logger.info(`Updating status for ${id}`, data);

  // Get the backup collection document
  const document = admin.firestore().doc(config.statusDoc);

  // Update the document
  return document.set({...data}, {merge: true});
};

export const updateBackup = (id: string, data: any) => {
  // log update
  logger.info(`Updating backup for ${id}`, data);

  // Get the backup collection document
  const document = admin
    .firestore()
    .doc(config.backupDoc)
    .collection('exports')
    .doc(`${id}`);

  // Update the document
  return document.set({...data}, {merge: true});
};
