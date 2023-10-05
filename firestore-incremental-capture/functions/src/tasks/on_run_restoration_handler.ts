import {getFunctions} from 'firebase-admin/functions';
import config from '../config';

export const onRunRestorationHandler = async () => {
  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/onBackupRestore`,
    config.instanceId
  );

  /** Queue a restoration task */
  return queue.enqueue({});
};
