import * as functions from 'firebase-functions';
import config from '../config';

import {getFunctions} from 'firebase-admin/functions';
import {serializeData} from '../utils/serialize';

const getState = (
  chnage: functions.Change<functions.firestore.DocumentSnapshot>
) => {
  /** return if created */
  if (!chnage.before?.exists) return 'CREATE';

  /** return if deleted */
  if (!chnage.after?.exists) return 'DELETE';

  /** else return updated */
  return 'UPDATE';
};

export const syncDataHandler = async (
  change: functions.Change<functions.firestore.DocumentSnapshot>,
  ctx: functions.EventContext
) => {
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/syncDataTask`,
    config.instanceId
  );

  /** state whether the update is an CREATE, UPDATE or DELETE */
  const changeType = getState(change);

  /** format data */
  const beforeData = change.before ? change.before.data() : null;
  const afterData = change.after ? change.after.data() : null;

  /** serialize data */
  const serializedBeforeData = serializeData(beforeData);
  const serializedAfterData = serializeData(afterData);

  return queue.enqueue({
    beforeData: JSON.stringify(serializedBeforeData),
    afterData: JSON.stringify(serializedAfterData),
    documentId: change.before?.id || change.after.id,
    documentPath: change.before?.ref?.path || change.after.ref.path,
    timestamp: ctx.timestamp,
    changeType,
  });
};
