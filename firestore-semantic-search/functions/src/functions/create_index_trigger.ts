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
