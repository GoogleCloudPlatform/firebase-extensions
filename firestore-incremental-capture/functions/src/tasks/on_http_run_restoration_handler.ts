import {getFunctions} from 'firebase-admin/functions';

import config from '../config';
import {onBackupRestore} from '../index';

export const onHttpRunRestorationHandler = async () => {
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/${onBackupRestore.name}`,
    config.instanceId
  );

  // Queue a restoration task
  return queue.enqueue({});
};
