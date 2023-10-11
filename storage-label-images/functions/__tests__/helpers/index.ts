import {DocumentData, Query} from 'firebase-admin/firestore';

const fetch = require('node-fetch');

export const clearFirestore = async (): Promise<void> => {
  await fetch(
    'http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents',
    {method: 'DELETE'}
  );
};

export const waitForDocumentToExistInCollection = (
  query: Query,
  field: string | number,
  value: any,
  timeout = 20_000
): Promise<DocumentData> => {
  return new Promise((resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(
        new Error(
          `Timeout waiting for firestore document to exist with field ${field} in collection`
        )
      );
    }, timeout);

    const unsubscribe = query.onSnapshot(async snapshot => {
      const docs = snapshot.docChanges();

      const record: DocumentData = docs.filter(
        $ => $.doc.data()[field] === value
      )[0];

      if (record) {
        unsubscribe();
        if (!timedOut) {
          clearTimeout(timer);
          resolve(record);
        }
      }
    });
  });
};
