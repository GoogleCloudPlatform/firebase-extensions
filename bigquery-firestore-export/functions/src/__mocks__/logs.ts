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
