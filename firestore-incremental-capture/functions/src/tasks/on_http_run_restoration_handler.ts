import {getFunctions} from 'firebase-admin/functions';
import {Request, Response, logger} from 'firebase-functions/v1';

import config from '../config';

export const onHttpRunRestorationHandler = async (
  request: Request,
  response: Response
) => {
  const timestamp = request.body.timestamp;
  if (!timestamp) {
    logger.error(
      '"timestamp" field is missing, please ensure that you are sending a valid timestamp in the request body'
    );
    return Promise.resolve();
  }

  const now = new Date().getTime();

  if (timestamp >= now) {
    logger.error('The timestamp is in the future, aborting');
    return Promise.resolve();
  }

  const taskName = `projects/${config.projectId}/locations/${config.location}/functions/onBackupRestore`;

  const queue = getFunctions().taskQueue(taskName, config.instanceId);

  logger.log(
    `Enqueuing task ${taskName} with timestamp ${timestamp}`,
    request.body
  );

  // Queue a restoration task
  await queue.enqueue(request.body);
  response.status(200).send('Restoration task enqueued');
};
