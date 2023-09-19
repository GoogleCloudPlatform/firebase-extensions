import * as firestore from '@google-cloud/firestore';
import config from '../config';
import {logger} from 'firebase-functions/v1';

const client = new firestore.v1.FirestoreAdminClient({
  projectId: config.projectId,
});

/**
 * Regularly ping the export operation to check for completion
 */
export async function WaitForExportCompletion(name: string) {
  logger.log('Checking for export progress: ', name);
  const response = await client.checkExportDocumentsProgress(name);
  if (!response.done) {
    // Wait for 1 minute retrying
    await new Promise(resolve => setTimeout(resolve, 60000));
    /** try again */
    await WaitForExportCompletion(name);
  }
  return Promise.resolve(response);
}

/**
 * Export data from Firestore to GCS
 */
export async function createExport() {
  const {projectId, syncCollectionPath, bucketName} = config;
  const name = client.databasePath(projectId, '(default)');
  const id = new Date().valueOf();

  /** Start backup */
  const [operation] = await client.exportDocuments({
    name,
    outputUriPrefix: `gs://${bucketName}/backups/${id}`,
    collectionIds:
      syncCollectionPath === '**' ? [] : syncCollectionPath.split(','),
  });

  return {id, operation};
}

/**
 * Regularly ping the import operation to check for completion
 */
export async function WaitForImportCompletion(name: string) {
  logger.log('Checking for import progress: ', name);
  const response = await client.checkImportDocumentsProgress(name);
  if (!response.done) {
    // Wait for 1 minute retrying
    await new Promise(resolve => setTimeout(resolve, 60000));
    /** try again */
    await WaitForImportCompletion(name);
  }
  return Promise.resolve(response);
}

/**
 * Imports data from GCS to the specified Firestore backup instance
 */
export async function createImport(id: string) {
  const {projectId, syncCollectionPath, bucketName} = config;

  /** Extract the database name from the backup instance name */
  const values = config.backupInstanceName.split('/');
  const database = values[values.length - 1];

  const name = client.databasePath(projectId, database);

  /** Start backup */
  const [operation] = await client.importDocuments({
    name,
    inputUriPrefix: `gs://${bucketName}/backups/${id}`,
    collectionIds:
      syncCollectionPath === '**' ? [] : syncCollectionPath.split(','),
  });

  return {id, operation};
}
