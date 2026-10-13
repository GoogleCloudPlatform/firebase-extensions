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

/**
 * Mock for src/logs.ts
 * Silences all log output during tests
 */

export const obfuscatedConfig = {};

export const init = jest.fn();
export const start = jest.fn();
export const error = jest.fn();
export const errorWritingToFirestore = jest.fn();
export const complete = jest.fn();
export const bigqueryJobStarted = jest.fn();
export const createTransferConfig = jest.fn();
export const transferConfigCreated = jest.fn();
export const updateTransferConfig = jest.fn();
export const transferConfigUpdated = jest.fn();
export const writeRunResultsToFirestore = jest.fn();
export const runResultsWrittenToFirestore = jest.fn();
export const bigqueryResultsRowCount = jest.fn();
export const pubsubMessage = jest.fn();
export const pubsubMessageHandled = jest.fn();
export const partitioningFieldRemovalAttempted = jest.fn();
export const latestDocUpdateSkipped = jest.fn();
export const handlingNonSuccessRun = jest.fn();
export const invalidResourceName = jest.fn();
export const bigqueryQueryFailed = jest.fn();
export const transferConfigNotFound = jest.fn();
export const getTransferConfigFailed = jest.fn();
