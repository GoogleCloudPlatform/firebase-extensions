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

import * as admin from 'firebase-admin';
admin.initializeApp({
  projectId: 'karas-coffee-fvs-01',
});

const firestore = admin.firestore();
describe.skip('sandbox', () => {
  test('sandbox', async () => {
    // const phrases = [
    //   "tree river",
    //   "leaf ocean",
    //   "ice bird",
    //   "mountain fish",
    //   "bird forest",
    //   "rain fire",
    //   "storm flower",
    //   "moon river",
    //   "rain fish",
    //   "fish tree",
    //   "ocean forest",
    //   "ice fire",
    //   "flower mountain",
    //   "fish mountain",
    //   "rain tree",
    //   "moon ice",
    //   "rain fish",
    //   "forest moon",
    //   "storm leaf",
    //   "sky wind",
    // ];

    // for (let phrase of phrases) {
    //   await firestore.collection("backfill_test").add({ input: phrase });
    // }

    await firestore
      .collection('index_test_123')
      .get()
      .then(snapshot => {
        snapshot.forEach(doc => {
          console.log(doc.id, '=>', doc.data());
        });
      });

    await firestore
      .collection('backfill_test')
      .get()
      .then(snapshot => {
        const docs = snapshot.docs;

        console.log(docs.map(doc => doc.data()));
      });
  }, 10000);
});
// Run the functions
