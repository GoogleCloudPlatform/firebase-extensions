import {getFunctions} from 'firebase-admin/functions';
import {Request, Response, logger} from 'firebase-functions/v1';

import config from '../config';

export const onHttpRunRestorationHandler = async (
  _: Request,
  response: Response
) => {
  const taskName = `projects/${config.projectId}/locations/${config.location}/functions/onBackupRestore`;
  logger.log(`Enqueuing task ${taskName}`);

  const queue = getFunctions().taskQueue(taskName, config.instanceId);

  // Queue a restoration task
  await queue.enqueue({});
  response.send('Restoration task enqueued');
};
