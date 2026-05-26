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
 * BigQuery table schemas for E2E testing
 */

export const basicTableSchema = [
  {name: 'id', type: 'STRING', mode: 'REQUIRED'},
  {name: 'name', type: 'STRING', mode: 'NULLABLE'},
  {name: 'value', type: 'INTEGER', mode: 'NULLABLE'},
  {name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE'},
];

export const complexTableSchema = [
  {name: 'id', type: 'STRING', mode: 'REQUIRED'},
  {name: 'user_id', type: 'STRING', mode: 'NULLABLE'},
  {name: 'product_name', type: 'STRING', mode: 'NULLABLE'},
  {name: 'quantity', type: 'INTEGER', mode: 'NULLABLE'},
  {name: 'price', type: 'FLOAT', mode: 'NULLABLE'},
  {name: 'total', type: 'FLOAT', mode: 'NULLABLE'},
  {name: 'status', type: 'STRING', mode: 'NULLABLE'},
  {name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE'},
  {name: 'updated_at', type: 'TIMESTAMP', mode: 'NULLABLE'},
  {name: 'metadata', type: 'JSON', mode: 'NULLABLE'},
];

export const nestedTableSchema = [
  {name: 'id', type: 'STRING', mode: 'REQUIRED'},
  {name: 'name', type: 'STRING', mode: 'NULLABLE'},
  {
    name: 'address',
    type: 'RECORD',
    mode: 'NULLABLE',
    fields: [
      {name: 'street', type: 'STRING', mode: 'NULLABLE'},
      {name: 'city', type: 'STRING', mode: 'NULLABLE'},
      {name: 'state', type: 'STRING', mode: 'NULLABLE'},
      {name: 'zip', type: 'STRING', mode: 'NULLABLE'},
    ],
  },
  {
    name: 'tags',
    type: 'STRING',
    mode: 'REPEATED',
  },
  {name: 'created_at', type: 'TIMESTAMP', mode: 'NULLABLE'},
];

export const allDataTypesSchema = [
  {name: 'id', type: 'STRING', mode: 'REQUIRED'},
  {name: 'bool_field', type: 'BOOLEAN', mode: 'NULLABLE'},
  {name: 'bytes_field', type: 'BYTES', mode: 'NULLABLE'},
  {name: 'date_field', type: 'DATE', mode: 'NULLABLE'},
  {name: 'datetime_field', type: 'DATETIME', mode: 'NULLABLE'},
  {name: 'time_field', type: 'TIME', mode: 'NULLABLE'},
  {name: 'timestamp_field', type: 'TIMESTAMP', mode: 'NULLABLE'},
  {name: 'int64_field', type: 'INTEGER', mode: 'NULLABLE'},
  {name: 'float64_field', type: 'FLOAT', mode: 'NULLABLE'},
  {name: 'numeric_field', type: 'NUMERIC', mode: 'NULLABLE'},
  {name: 'string_field', type: 'STRING', mode: 'NULLABLE'},
  {name: 'geography_field', type: 'GEOGRAPHY', mode: 'NULLABLE'},
  {name: 'json_field', type: 'JSON', mode: 'NULLABLE'},
];
