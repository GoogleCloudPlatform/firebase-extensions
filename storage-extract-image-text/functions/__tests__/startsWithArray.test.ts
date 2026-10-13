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

import {startsWithArray} from '../src/util';

describe('startsWithArray', () => {
  test('returns true when the image path starts with a path in the array', () => {
    const userInputPaths = ['/images'];
    const imagePath = '/images/1234.jpg';

    const result = startsWithArray(userInputPaths, imagePath);

    expect(result).toBe(true);
  });
});
