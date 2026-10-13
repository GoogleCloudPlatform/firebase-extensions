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

import {Query} from '../../src/types/query';

describe('Query class tests', () => {
  test('should initialize the Query object with given id and featureVector', () => {
    const id = 'testId';
    const featureVector = [0.5, 0.6, 0.7];
    const query = new Query(id, featureVector);

    expect(query.id).toEqual(id);
    expect(query.featureVector).toEqual(featureVector);
  });

  test('toVertexQuery() should return the proper vertex query format', () => {
    const id = 'testId';
    const featureVector = [0.5, 0.6, 0.7];
    const expectedVertexQuery = {
      datapoint: {
        datapoint_id: id,
        feature_vector: featureVector,
      },
    };
    const query = new Query(id, featureVector);

    const result = query.toVertexQuery();
    expect(result).toEqual(expectedVertexQuery);
  });
});
