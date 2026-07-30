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

import getEmbeddingsPaLM from '../src/common/palm_embeddings';
import getEmbeddingsUSE from '../src/common/use_embeddings';
import {getDatapointsList, mapAndFilterData} from '../src/common/datapoints';
import config from '../src/config';

// TODO: these need authentication/PaLM access to run correctly, skip for now
describe.skip('getEmbeddingsPaLM', () => {
  test('should embed a single string', async () => {
    const embeddings = await getEmbeddingsPaLM('hello world');

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(1);
    expect(embeddings[0].length).toBe(768);
  });

  test('should embed an array of strings', async () => {
    const embeddings = await getEmbeddingsPaLM([
      'this is a test string',
      'this is another test string',
    ]);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(2);
    expect(embeddings[0].length).toBe(768);
    expect(embeddings[1].length).toBe(768);
  });
});

describe.skip('getEmbeddingsUSE', () => {
  test('should embed a single string', async () => {
    const embeddings = await getEmbeddingsUSE('hello world');

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(1);
    expect(embeddings[0].length).toBe(512);
  });

  test('should embed an array of strings', async () => {
    const embeddings = await getEmbeddingsUSE([
      'this is a test string',
      'this is another test string',
    ]);

    expect(embeddings).toBeDefined();
    expect(embeddings.length).toBe(2);
    expect(embeddings[0].length).toBe(512);
    expect(embeddings[1].length).toBe(512);
  });
});

describe.skip('getDatapointsList', () => {
  test('mapData should return an array of strings', () => {
    const data = {
      foo: 'bar',
      bar: 'baz',
      baz: 'foo',
    };

    console.log('CONFIG', config);
    const mapped = mapAndFilterData(data);
    console.log(mapped);
    expect(mapped).toBeDefined();
    // in env, FIELDS is set to foo. TODO: make this hardcoded and indep of env for test
    expect(mapped.length).toBe(1);
  });

  test('should embed a list of datapoints', async () => {
    const datapoints = await getDatapointsList([
      {
        id: '1',
        data: {
          foo: 'bar',
        },
      },
      {
        id: '2',
        data: {
          foo: 'bar',
        },
      },
    ]);
    expect(datapoints).toBeDefined();
    expect(datapoints.length).toBe(2);
    expect(datapoints[0].id).toBe('1');
    expect(datapoints[1].id).toBe('2');
    expect(datapoints[0].embedding).toBeDefined();
    expect(datapoints[1].embedding).toBeDefined();

    expect(Array.isArray(datapoints[0].embedding)).toBe(true);
    expect(Array.isArray(datapoints[1].embedding)).toBe(true);
  });
});
