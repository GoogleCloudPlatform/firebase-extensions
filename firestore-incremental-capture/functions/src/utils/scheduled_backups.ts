import {firestore} from 'firebase-admin';
import {logger} from 'firebase-functions/v1';

import * as google from 'googleapis';

import config from '../config';
import {RestoreJobInfo} from '../models/restore_job_info';

const firestore_api = new google.firestore_v1.Firestore({
  rootUrl: `https://${config.location}-firestore.googleapis.com`,
});

export function updateRestoreJobDoc(
  ref: FirebaseFirestore.DocumentReference,
  data: RestoreJobInfo
): Promise<firestore.WriteResult> {
  return ref.update({...data, updated: firestore.Timestamp.now()});
}

/**
 * Checks if a backup exists for the given source database ID.
 *
 * @param databaseId The source database ID.
 * @returns {google.firestore_v1.Schema$GoogleFirestoreAdminV1Backup} The most recent backup for the database.
 */
export async function checkIfBackupExists(
  databaseId: string
): Promise<google.firestore_v1.Schema$GoogleFirestoreAdminV1Backup> {
  const backups = await firestore_api.projects.locations.backups.list({
    parent: `projects/${config.projectId}/locations/${config.location}`,
  });

  if (!backups.data?.backups || backups.data?.backups?.length === 0)
    throw new Error('BACKUP_NOT_FOUND');

  // Sort to get the most recent backup
  const sortedBackups = backups.data.backups.sort((a, b) => {
    return (
      new Date(b.snapshotTime as string).getTime() -
      new Date(a.snapshotTime as string).getTime()
    );
  });

  // Filter by databaseId and state
  const filteredBackups = sortedBackups.filter(backup => {
    return backup.name?.includes(databaseId) && backup.state === 'READY';
  });

  if (filteredBackups.length === 0) throw new Error('BACKUP_NOT_FOUND');

  return Promise.resolve(filteredBackups[0]);
}

export async function checkIfBackupScheduleExists(
  databaseId: string
): Promise<
  google.firestore_v1.Schema$GoogleFirestoreAdminV1BackupSchedule | undefined
> {
  try {
    const bs = await firestore_api.projects.databases.backupSchedules.list({
      parent: `projects/${config.projectId}/databases/${databaseId}`,
    });

    if (!bs.data?.backupSchedules || bs.data?.backupSchedules?.length === 0)
      throw new Error('BACKUP_SCHEDULE_NOT_FOUND');

    // Filter by databaseId and state
    const filteredBackups = bs.data.backupSchedules.filter(backup => {
      return backup.name?.includes(databaseId);
    });

    if (filteredBackups.length === 0)
      throw new Error('BACKUP_SCHEDULE_NOT_FOUND');

    return filteredBackups[0];
  } catch (error) {
    logger.warn(`Failed to get backup schedule: ${error}`);
    return;
  }
}

/**
 * The destination database already exists, delete it before restoring.
 * Scheduled backups can only be restored to a non-existing database.
 *
 * @param resourceName The resource name of the database to delete, must be in the format `projects/{project_id}/databases/{database_id}`.
 * @returns A promise that resolves when the database has been deleted.
 */
export async function deleteExistingDestinationDatabase(resourceName: string) {
  const databaseMetadata = await firestore_api.projects.databases.get({
    name: resourceName,
  });

  if (databaseMetadata.data) {
    // Delete the existing database
    try {
      await firestore_api.projects.databases.delete({
        name: resourceName,
      });
    } catch (ex: any) {
      logger.warn('Error deleting database', ex);
    }
  } else {
    logger.info('Database does not exist');
  }

  return;
}

/**
 * Setup scheduled backups for the Firestore database.
 * Could be the default database or any other database in the project.
 * */
export async function setupScheduledBackups(): Promise<google.firestore_v1.Schema$GoogleFirestoreAdminV1BackupSchedule> {
  try {
    // Check if a backup schedule already exists
    const bs = await checkIfBackupScheduleExists('(default)');

    if (bs) {
      logger.info(
        `A backup schedule already exists for the Firestore database: ${bs.name}`
      );
      return bs;
    }

    const newBs = await firestore_api.projects.databases.backupSchedules.create(
      {
        requestBody: {
          retention: '7d',
          dailyRecurrence: {},
        },
        parent: `projects/${config.projectId}/databases/(default)`,
      }
    );

    return newBs.data;
  } catch (error) {
    logger.warn(`Failed to setup scheduled backups: ${error}`);
    throw error;
  }
}
