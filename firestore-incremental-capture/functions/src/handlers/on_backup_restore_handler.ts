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

import {logger} from 'firebase-functions/v1';

import {launchJob} from '../common';

export const onBackupRestoreHandler = async (data: any) => {
  const timestamp = data.timestamp as number;

  if (!isValidUnixTimestamp(timestamp)) {
    logger.error(
      '"timestamp" field is missing, please ensure that you are sending a valid timestamp in the request body, is in seconds since epoch and is not in the future.'
    );
    return Promise.resolve();
  }

  logger.info(`Running backup restoration at PIT ${timestamp}`);

  try {
    // Run DataFLow updates
    await launchJob(timestamp);
  } catch (ex: any) {
    logger.error('Error restoring backup', ex);

    return Promise.resolve();
  }
};

/**
 * Checks if a long integer is a valid UNIX timestamp in seconds.
 *
 * @param timestamp The timestamp to check.
 * @returns Whether the timestamp is valid.
 */
function isValidUnixTimestamp(timestamp: number): boolean {
  // Ensure it's a non-negative integer
  if (!timestamp || timestamp < 0 || !Number.isInteger(timestamp)) {
    return false;
  }

  // Get the current UNIX timestamp
  const currentTimestamp: number = Math.floor(Date.now() / 1000);

  // Ensure the timestamp isn't in the future
  if (timestamp > currentTimestamp) {
    return false;
  }

  return true;
}
