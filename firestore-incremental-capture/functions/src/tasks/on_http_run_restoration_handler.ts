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

import {OAuth2Client} from 'google-auth-library';
import {getFunctions} from 'firebase-admin/functions';
import {Request, Response, logger} from 'firebase-functions/v1';

import config from '../config';

const authClient = new OAuth2Client();

function parseAuthorizedPrincipals(): string[] {
  if (process.env.AUTHORIZED_RESTORE_PRINCIPALS !== undefined) {
    return process.env.AUTHORIZED_RESTORE_PRINCIPALS.split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
  }
  return config.authorizedRestorePrincipals || [];
}

function getExpectedAudience(): string {
  if (process.env.RESTORATION_AUDIENCE) {
    return process.env.RESTORATION_AUDIENCE;
  }
  const functionName =
    process.env.FUNCTION_NAME ||
    `ext-${config.instanceId}-onHttpRunRestoration`;
  return `https://${config.location}-${config.projectId}.cloudfunctions.net/${functionName}`;
}

export const onHttpRunRestorationHandler = async (
  request: Request,
  response: Response
) => {
  if (request.method !== 'POST') {
    response.status(405).send('Method Not Allowed');
    return;
  }

  const authHeader = request.headers?.authorization;
  const match =
    typeof authHeader === 'string'
      ? authHeader.match(/^Bearer\s+(\S+)$/i)
      : null;

  if (!match) {
    response.status(401).send('Unauthorized: missing bearer token');
    return;
  }

  let email: string | undefined;
  let emailVerified = false;
  try {
    const ticket = await authClient.verifyIdToken({
      idToken: match[1],
      audience: getExpectedAudience(),
    });
    const payload = ticket.getPayload();
    email = payload?.email?.toLowerCase();
    emailVerified = payload?.email_verified === true;
  } catch (error) {
    logger.warn('Failed to verify OIDC token for restoration request', error);
    response.status(401).send('Unauthorized: invalid identity token');
    return;
  }

  const authorizedPrincipals = parseAuthorizedPrincipals();
  if (
    !emailVerified ||
    !email ||
    authorizedPrincipals.length === 0 ||
    !authorizedPrincipals.includes(email)
  ) {
    logger.warn('Unauthorized restoration attempt', {email});
    response
      .status(403)
      .send('Forbidden: caller is not authorized to trigger restoration');
    return;
  }

  const timestamp = request.body?.timestamp;
  if (
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp) ||
    timestamp <= 0
  ) {
    logger.error(
      '"timestamp" field is missing or invalid, please ensure that you are sending a valid numeric timestamp in the request body'
    );
    response.status(400).send('Bad Request: invalid "timestamp" field');
    return;
  }

  const now = Date.now();
  if (timestamp >= now) {
    logger.error('The timestamp is in the future, aborting');
    response
      .status(400)
      .send('Bad Request: "timestamp" cannot be in the future');
    return;
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
