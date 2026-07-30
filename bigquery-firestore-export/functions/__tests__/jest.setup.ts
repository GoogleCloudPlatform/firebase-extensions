/**
 * Copyright 2026 Google LLC
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

const path = require('path');

(async function () {
  require('dotenv').config({
    path: path.resolve(
      __dirname,
      '../../../extensions/firestore-bigquery-scheduler.env'
    ),
  });

  process.env.EXT_INSTANCE_ID = 'firestore-bigquery-scheduler';

  process.env.GCLOUD_PROJECT = 'dev-extensions-testing';
  process.env.PROJECT_ID = 'dev-extensions-testing';
})();
