import * as admin from 'firebase-admin';

export const onProcessReplayUpdatesHandler = async (data: any) => {
  const db = admin.firestore();

  /** Set the database to our backup database */
  db.settings({
    databaseId: 'da-backup',
  });

  /** Extract rows from the data */
  const {rows} = data;

  /** Batch insert updaates into firestore */
  const batch = db.batch();
  rows.forEach((row: any) => {
    /** Get the document path and status of the row */
    const {documentPath, changeType} = row;

    const docRef = db.doc(documentPath);

    /** Delete record with a delete status */
    if (changeType === 'DELETE') batch.delete(docRef);

    /** Update record with a delete change type */
    if (changeType === 'UPDATE') batch.set(docRef, row.afterData);

    /** Create a record with a create chnage type */
    if (changeType === 'CREATE') batch.set(docRef, row.afterData);
  });

  await batch.commit();
};
