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

import config from '../config';

import {updateIndex} from '../common/vertex';
import {IndexStatus} from '../types/index_status';

export async function updateIndexConfigHandler() {
  try {
    // get the index config from the database
    const meatdataDoc = admin.firestore().doc(config.metadataDoc);
    const metdata = await meatdataDoc.get();
    const {index, status} = metdata.data() as {
      index: string;
      status: IndexStatus;
    };

    if (status !== IndexStatus.DEPLOYED || !index) {
      throw new Error(`Index ${index} is not deployed or does not exist.`);
    }

    await meatdataDoc.update({
      status: IndexStatus.UPDATING,
    });

    functions.logger.info(`Updating index ${index}...`);
    functions.logger.info(config);

    await updateIndex(index);
    functions.logger.info(`Index ${index} updated.`);

    await meatdataDoc.update({
      status: IndexStatus.DEPLOYED,
    });
  } catch (error) {
    functions.logger.error(error);
    throw error;
  }
}
