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
 * Sample BigQuery queries for E2E testing
 */

export const testQueries = {
  // Basic queries
  selectAll: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\``,

  selectColumns: (
    projectId: string,
    datasetId: string,
    tableName: string,
    columns: string[]
  ) =>
    `SELECT ${columns.join(
      ', '
    )} FROM \`${projectId}.${datasetId}.${tableName}\``,

  selectWithFilter: (
    projectId: string,
    datasetId: string,
    tableName: string,
    condition: string
  ) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\` WHERE ${condition}`,

  selectWithLimit: (
    projectId: string,
    datasetId: string,
    tableName: string,
    limit: number
  ) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\` LIMIT ${limit}`,

  // Aggregation queries
  countQuery: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT COUNT(*) as total_count FROM \`${projectId}.${datasetId}.${tableName}\``,

  groupByQuery: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT
      DATE(timestamp) as date,
      COUNT(*) as count,
      SUM(value) as total_value,
      AVG(value) as avg_value
    FROM \`${projectId}.${datasetId}.${tableName}\`
    GROUP BY date
    ORDER BY date DESC`,

  aggregationWithFilter: (
    projectId: string,
    datasetId: string,
    tableName: string
  ) =>
    `SELECT
      name,
      COUNT(*) as count,
      MAX(value) as max_value,
      MIN(value) as min_value
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE value > 100
    GROUP BY name
    HAVING count > 1`,

  // Window function queries
  windowFunction: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT
      id,
      name,
      value,
      ROW_NUMBER() OVER (PARTITION BY name ORDER BY value DESC) as rank
    FROM \`${projectId}.${datasetId}.${tableName}\``,

  // Complex queries
  subquery: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE value > (
      SELECT AVG(value) FROM \`${projectId}.${datasetId}.${tableName}\`
    )`,

  cte: (projectId: string, datasetId: string, tableName: string) =>
    `WITH high_values AS (
      SELECT * FROM \`${projectId}.${datasetId}.${tableName}\`
      WHERE value > 500
    )
    SELECT
      name,
      COUNT(*) as high_value_count,
      AVG(value) as avg_high_value
    FROM high_values
    GROUP BY name`,

  // Join queries (for testing with multiple tables)
  joinQuery: (
    projectId: string,
    datasetId: string,
    table1: string,
    table2: string
  ) =>
    `SELECT
      t1.*,
      t2.name as related_name
    FROM \`${projectId}.${datasetId}.${table1}\` t1
    LEFT JOIN \`${projectId}.${datasetId}.${table2}\` t2
    ON t1.id = t2.id`,

  // Time-based queries for partitioning tests
  timeRangeQuery: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)`,

  dailyAggregation: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT
      DATE(timestamp) as date,
      COUNT(*) as daily_count,
      SUM(value) as daily_total
    FROM \`${projectId}.${datasetId}.${tableName}\`
    WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    GROUP BY date
    ORDER BY date`,
};

/**
 * Schedule patterns for testing
 */
export const testSchedules = {
  everyMinute: 'every 1 minutes', // Note: minimum for BigQuery DTS
  every15Minutes: 'every 15 minutes',
  every30Minutes: 'every 30 minutes',
  everyHour: 'every 60 minutes',
  every6Hours: 'every 6 hours',
  everyDay: 'every 24 hours',
  everyDayAt9am: 'every day 09:00',
  everyWeekday: 'every monday,tuesday,wednesday,thursday,friday 09:00',
  everyWeek: 'every sunday 00:00',
  everyMonth: 'first sunday of month 00:00',
};

/**
 * Error-prone queries for testing error handling
 */
export const errorQueries = {
  // Syntax error
  syntaxError: (projectId: string, datasetId: string, tableName: string) =>
    `SELCT * FROM \`${projectId}.${datasetId}.${tableName}\``, // Typo in SELECT

  // Missing table
  missingTable: (projectId: string, datasetId: string) =>
    `SELECT * FROM \`${projectId}.${datasetId}.nonexistent_table\``,

  // Invalid column
  invalidColumn: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT nonexistent_column FROM \`${projectId}.${datasetId}.${tableName}\``,

  // Division by zero
  divisionByZero: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT value / 0 as result FROM \`${projectId}.${datasetId}.${tableName}\``,

  // Type mismatch
  typeMismatch: (projectId: string, datasetId: string, tableName: string) =>
    `SELECT * FROM \`${projectId}.${datasetId}.${tableName}\` WHERE name = 123`,
};
