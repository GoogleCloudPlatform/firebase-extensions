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

import {extractOverrides} from '../../src/overrides'; // Adjust the import as per your file structure

describe('extractOverrides function', () => {
  let mockDocSnap: any;

  beforeEach(() => {
    mockDocSnap = {
      get: jest.fn(field => mockDocSnap[field]),
      exists: jest.fn().mockReturnValue(true),
      data: () => mockDocSnap,
      // Mock other necessary DocumentSnapshot methods here
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should correctly extract string fields', () => {
    mockDocSnap['context'] = 'testContext';
    mockDocSnap['model'] = 'testModel';

    const overrides = extractOverrides(mockDocSnap);

    expect(overrides).toEqual({
      context: 'testContext',
      model: 'testModel',
    });
  });

  test('should correctly extract integer fields', () => {
    mockDocSnap['topK'] = '10';
    mockDocSnap['candidateCount'] = 5;

    const overrides = extractOverrides(mockDocSnap);

    expect(overrides).toEqual({
      topK: 10,
      candidateCount: 5,
    });
  });

  test('should correctly extract float fields', () => {
    mockDocSnap['topP'] = '0.9';
    mockDocSnap['temperature'] = 0.7;

    const overrides = extractOverrides(mockDocSnap);

    expect(overrides).toEqual({
      topP: 0.9,
      temperature: 0.7,
    });
  });

  test('should handle invalid data gracefully', () => {
    mockDocSnap['context'] = 123; // Invalid context
    mockDocSnap['topK'] = 'not-a-number'; // Invalid topK

    expect(() => extractOverrides(mockDocSnap)).toThrow();
  });
});
