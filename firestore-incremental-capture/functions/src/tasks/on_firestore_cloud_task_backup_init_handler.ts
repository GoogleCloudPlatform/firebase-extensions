import {getExtensions} from 'firebase-admin/extensions';

import {logger} from 'firebase-functions/v1';
import {updateBackup, updateStatus} from '../utils/database';

import {waitForExportCompletion} from '../utils/import_export';
import {FieldValue} from 'firebase-admin/firestore';

export const onFirestoreCloudTaskBackupInitHandler = async (data: any) => {
  const {id, name} = data;
  const runtime = getExtensions().runtime();

  /** Update the status */
  await runtime.setProcessingState(
    'NONE',
    'Waiting for the export to be completed'
  );

  try {
    /** Update the Firestore status */
    await updateStatus(id, {
      status: 'Exporting initial backup',
    });

    /** Start polling for updates */
    await waitForExportCompletion(name);

    /** Set status to completed */
    await updateStatus(id, {
      status: 'Completed',
    });

    /** Update the current backup */
    updateBackup(id, {
      status: 'Completed',
      timestamp: FieldValue.serverTimestamp(),
    });

    /** Update the status */
    await runtime.setProcessingState(
      'PROCESSING_COMPLETE',
      'Successfully backed up to Firestore'
    );
  } catch (ex: any) {
    logger.error('Error backing up to BQ', ex);

    await updateStatus(id, {
      status: 'Error',
      error: ex.message,
    });

    await runtime.setProcessingState(
      'PROCESSING_FAILED',
      'Error backing up to Firestore'
    );

    return Promise.resolve();
  }

  return Promise.resolve();
};
