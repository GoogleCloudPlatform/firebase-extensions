import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import {BackfillStatus} from '../types/backfill_status';
import {IndexStatus} from '../types/index_status';
import {createIndex} from '../common/vertex';
import config from '../config';

export async function createIndexTriggerHandler(
  change: functions.Change<functions.firestore.QueryDocumentSnapshot>
) {
  const statusAfter = change.after.get('status');
  const statusBefore = change.before.get('status');

  if (!statusAfter || statusAfter === statusBefore) return;

  if (statusAfter === BackfillStatus.DONE) {
    functions.logger.log(
      `Backfill task is done, creating the index with ${config.dimension} dimensions...`
    );

    const operation = await createIndex();
    functions.logger.log('Index creation initiated!', operation);

    await admin.firestore().doc(config.metadataDoc).set({
      status: IndexStatus.BUILDING,
      operation,
    });
  }
}
