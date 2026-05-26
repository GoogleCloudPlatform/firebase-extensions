/**
 * Copyright 2025 Google LLC
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

/**
 * Test data generators for E2E tests
 */

/**
 * Generate basic test rows
 */
export const generateBasicRows = (
  count: number,
  options?: {
    prefix?: string;
    minValue?: number;
    maxValue?: number;
    startDate?: Date;
    endDate?: Date;
  }
): any[] => {
  const {
    prefix = 'test',
    minValue = 0,
    maxValue = 1000,
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate = new Date(),
  } = options || {};

  const rows = [];
  const dateRange = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    rows.push({
      id: `${prefix}-${i}`,
      name: `${prefix} Item ${i}`,
      value: Math.floor(Math.random() * (maxValue - minValue) + minValue),
      timestamp: new Date(
        startDate.getTime() + Math.random() * dateRange
      ).toISOString(),
    });
  }

  return rows;
};

/**
 * Generate complex test rows (for testing with complex schema)
 */
export const generateComplexRows = (count: number): any[] => {
  const statuses = [
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
  ];
  const products = ['Widget A', 'Widget B', 'Gadget X', 'Gadget Y', 'Tool Z'];
  const rows = [];

  for (let i = 0; i < count; i++) {
    const quantity = Math.floor(Math.random() * 10) + 1;
    const price = Math.random() * 100;
    const createdAt = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    );
    const updatedAt = new Date(
      createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000
    );

    rows.push({
      id: `order-${i}`,
      user_id: `user-${Math.floor(Math.random() * 100)}`,
      product_name: products[Math.floor(Math.random() * products.length)],
      quantity,
      price,
      total: quantity * price,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      metadata: JSON.stringify({
        source: 'e2e_test',
        test_run: Date.now(),
        additional_info: {
          test_id: i,
          random_value: Math.random(),
        },
      }),
    });
  }

  return rows;
};

/**
 * Generate nested data rows
 */
export const generateNestedRows = (count: number): any[] => {
  const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const states = ['NY', 'CA', 'IL', 'TX', 'AZ'];
  const tags = [
    'important',
    'urgent',
    'review',
    'approved',
    'pending',
    'archived',
  ];
  const rows = [];

  for (let i = 0; i < count; i++) {
    const cityIndex = Math.floor(Math.random() * cities.length);
    const tagCount = Math.floor(Math.random() * 4) + 1;
    const selectedTags = [];

    for (let j = 0; j < tagCount; j++) {
      selectedTags.push(tags[Math.floor(Math.random() * tags.length)]);
    }

    rows.push({
      id: `nested-${i}`,
      name: `Person ${i}`,
      address: {
        street: `${Math.floor(Math.random() * 9999)} Main St`,
        city: cities[cityIndex],
        state: states[cityIndex],
        zip: String(10000 + Math.floor(Math.random() * 90000)),
      },
      tags: [...new Set(selectedTags)], // Remove duplicates
      created_at: new Date().toISOString(),
    });
  }

  return rows;
};

/**
 * Generate rows with all data types
 */
export const generateAllDataTypeRows = (count: number): any[] => {
  const rows = [];

  for (let i = 0; i < count; i++) {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    rows.push({
      id: `all-types-${i}`,
      bool_field: Math.random() > 0.5,
      bytes_field: Buffer.from(`test-bytes-${i}`).toString('base64'),
      date_field: date.toISOString().split('T')[0], // YYYY-MM-DD
      datetime_field: now.toISOString().replace('Z', ''), // Remove Z for DATETIME
      time_field: now.toTimeString().split(' ')[0], // HH:MM:SS
      timestamp_field: now.toISOString(),
      int64_field: Math.floor(Math.random() * 1000000),
      float64_field: Math.random() * 1000,
      numeric_field: (Math.random() * 10000).toFixed(2),
      string_field: `Test string ${i}`,
      geography_field: `POINT(${-180 + Math.random() * 360} ${
        -90 + Math.random() * 180
      })`,
      json_field: JSON.stringify({
        index: i,
        timestamp: now.toISOString(),
        nested: {
          value: Math.random(),
          text: `Nested text ${i}`,
        },
      }),
    });
  }

  return rows;
};

/**
 * Generate time-series data for partitioning tests
 */
export const generateTimeSeriesData = (
  count: number,
  intervalMinutes = 60
): any[] => {
  const rows = [];
  const startTime = new Date(Date.now() - count * intervalMinutes * 60 * 1000);

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(
      startTime.getTime() + i * intervalMinutes * 60 * 1000
    );
    rows.push({
      id: `ts-${i}`,
      name: `Metric ${i % 5}`, // 5 different metric names
      value: 100 + Math.sin(i / 10) * 50 + Math.random() * 10, // Sinusoidal pattern with noise
      timestamp: timestamp.toISOString(),
    });
  }

  return rows;
};

/**
 * Generate large dataset for performance testing
 */
export const generateLargeDataset = (
  rowCount: number,
  batchSize = 10000
): Array<any[]> => {
  const batches = [];
  let generated = 0;

  while (generated < rowCount) {
    const currentBatchSize = Math.min(batchSize, rowCount - generated);
    batches.push(
      generateBasicRows(currentBatchSize, {
        prefix: `large-${generated}`,
      })
    );
    generated += currentBatchSize;
  }

  return batches;
};

/**
 * Generate data with specific patterns for testing filters
 */
export const generatePatternedData = (count: number): any[] => {
  const rows = [];
  const categories = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const isEven = i % 2 === 0;
    const tier =
      i < count / 3 ? 'low' : i < (2 * count) / 3 ? 'medium' : 'high';

    rows.push({
      id: `pattern-${i}`,
      name: `${category}-Item-${i}`,
      value: isEven ? i * 10 : i * 15,
      category,
      tier,
      is_active: isEven,
      timestamp: new Date(
        Date.now() - (count - i) * 60 * 60 * 1000
      ).toISOString(), // 1 hour apart
    });
  }

  return rows;
};
