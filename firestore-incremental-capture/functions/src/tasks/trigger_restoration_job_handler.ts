/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as google from 'googleapis';
import {Change, logger} from 'firebase-functions/v1';
import {DocumentSnapshot} from 'firebase-admin/firestore';

import config from '../config';
import {
  checkIfBackupExists,
  deleteExistingDestinationDatabase,
  updateRestoreJobDoc,
} from '../utils/scheduled_backups';
import {RestoreError, RestoreStatus} from '../models/restore_status';
import {RestoreJobData} from '../models/restore_job_data';
import {firestore} from 'firebase-admin';

const firestore_api = new google.firestore_v1.Firestore({
  rootUrl: `https://${config.location}-firestore.googleapis.com`,
});

export const triggerRestorationJobHandler = async (
  snapshot: Change<DocumentSnapshot>
) => {
  const ref = snapshot.after.ref;
  const data = snapshot.after.data() as RestoreJobData | undefined;
  const timestamp = data?.timestamp as firestore.Timestamp | undefined;
  const destinationDatabaseResourceName = `projects/${config.projectId}/databases/${data?.destinationDatabaseId}`;

  if (!timestamp || !isValidTimestamp(timestamp)) {
    logger.error(
      '"timestamp" field is missing, please ensure that you are sending a valid timestamp in the request body, is in seconds since epoch and is not in the future.'
    );

    await updateRestoreJobDoc(ref, {
      status: {
        message: RestoreStatus.FAILED,
        error: RestoreError.INVALID_TIMESTAMP,
      },
    });

    return;
  }

  if (!data?.destinationDatabaseId) {
    logger.error(
      '"destinationDatabaseId" field is missing, please ensure that you are sending a valid database ID in the request body.'
    );

    await updateRestoreJobDoc(ref, {
      status: {
        message: RestoreStatus.FAILED,
        error: RestoreError.INVALID_TIMESTAMP,
      },
    });

    return;
  }

  let backup: google.firestore_v1.Schema$GoogleFirestoreAdminV1Backup;

  // Check if there's a valid backup
  try {
    backup = await checkIfBackupExists(data?.destinationDatabaseId);
  } catch (ex: any) {
    logger.error('Error getting backup', ex);
    await updateRestoreJobDoc(ref, {
      status: {
        message: RestoreStatus.FAILED,
        error: `${RestoreError.BACKUP_NOT_FOUND}`,
      },
    });

    return;
  }

  // The destination database already exists, delete it before restoring
  await deleteExistingDestinationDatabase(destinationDatabaseResourceName);

  // Call restore function to build the baseline DB
  try {
    const operation = await firestore_api.projects.databases.restore({
      requestBody: {
        databaseId: data?.destinationDatabaseId,
        backup: backup.name,
      },
    });

    logger.info(`Running backup restoration at point-in-time ${timestamp}`);
    await updateRestoreJobDoc(ref, {
      status: {
        message: RestoreStatus.RUNNING,
      },
      operation: operation.data,
    });
  } catch (ex: any) {
    logger.error('Error restoring backup', ex);
    await updateRestoreJobDoc(ref, {
      status: {
        message: RestoreStatus.FAILED,
        error: `${RestoreError.EXCEPTION}: ${ex}`,
      },
    });

    return;
  }
};

/**
 * Checks if a long integer is a valid UNIX timestamp in seconds.
 *
 * @param timestamp The timestamp to check.
 * @returns Whether the timestamp is valid.
 */
function isValidTimestamp(timestamp: firestore.Timestamp): boolean {
  // Get the current UNIX timestamp
  const currentTimestamp = firestore.Timestamp.now().toMillis();

  // Ensure the timestamp isn't in the future
  if (timestamp.toMillis() > currentTimestamp) {
    return false;
  }

  return true;
}
