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
  const outputShape = change.after.get('outputShape');

  if (!statusAfter || statusAfter === statusBefore) return;

  if (!outputShape) {
    functions.logger.error(
      'Could not trigger index creation, output shape is not defined in task document.'
    );
    return;
  }
  if (typeof outputShape !== 'number') {
    functions.logger.error(
      'Could not trigger index creation, output shape is not a number.'
    );
    return;
  }

  if (statusAfter === BackfillStatus.DONE) {
    functions.logger.log(
      `Backfill task is done, creating the index with ${outputShape} dimensions...`
    );

    const operation = await createIndex(outputShape);
    functions.logger.log('Index creation initiated!', operation);

    await admin.firestore().doc(config.metadataDoc).set({
      status: IndexStatus.BUILDING,
      operation,
    });
  }
}
