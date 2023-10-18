import * as admin from 'firebase-admin';
import config from './config';

export async function updateFirestoreDocument(documentId: string, data: any) {
  if (!config.collectionPath) return;

  /** Get the Firestore document */
  const db = admin.firestore();
  const collection = db.collection(config.collectionPath);
  const document = collection.doc(documentId);

  await document.set({...data}, {merge: true});
}
