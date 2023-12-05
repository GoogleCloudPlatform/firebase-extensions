export enum RestoreStatus {
  NOT_STARTED = 'NOT_STARTED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum RestoreError {
  INVALID_TIMESTAMP = 'The timestamp is invalid',
  EXCEPTION = 'An exception occurred',
  BACKUP_NOT_FOUND = 'Backup not found',
}
