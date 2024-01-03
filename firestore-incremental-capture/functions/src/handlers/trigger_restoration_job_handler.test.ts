jest.mock('firebase-functions/v1');

const google = require('googleapis');

import {logger} from 'firebase-functions/v1';
import {triggerRestorationJobHandler} from './trigger_restoration_job_handler';
import {RestoreError, RestoreStatus} from '../common';
import {Timestamp} from 'firebase-admin/firestore';

describe('triggerRestorationJobHandler Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles invalid timestamp', async () => {
    // Setup a mock Firestore document snapshot
    const mockSnapshot = {
      data: () => ({
        /* ... mock data without a valid timestamp ... */
      }),
      ref: {
        update: jest.fn(),
      },
    };

    // Call the function with the mock snapshot
    await triggerRestorationJobHandler(mockSnapshot as any);

    // Assertions to verify behavior when timestamp is invalid
    expect(logger.error).toHaveBeenCalledWith(
      '"timestamp" field is missing, please ensure that you are sending a valid timestamp in the request body, is in seconds since epoch and is not in the future.'
    );

    expect(mockSnapshot.ref.update).toHaveBeenCalledWith({
      status: {
        message: RestoreStatus.FAILED,
        error: RestoreError.INVALID_TIMESTAMP,
      },
      updated: expect.anything(),
    });
  });

  it('handles missing destinationDatabaseId', async () => {
    // Setup a mock Firestore document snapshot
    const mockSnapshot = {
      data: () => ({
        timestamp: Timestamp.now(),
      }),
      ref: {
        update: jest.fn(),
      },
    };

    // Call the function with the mock snapshot
    await triggerRestorationJobHandler(mockSnapshot as any);

    // Assertions to verify behavior when destinationDatabaseId is missing
    expect(logger.error).toHaveBeenCalledWith(
      '"destinationDatabaseId" field is missing, please ensure that you are sending a valid database ID in the request body.'
    );

    expect(mockSnapshot.ref.update).toHaveBeenCalledWith({
      status: {
        message: RestoreStatus.FAILED,
        error: RestoreError.MISSING_DESTINATION_DATABASE_ID,
      },
      updated: expect.anything(),
    });
  });

  it('handles failed scheduled backups setup', async () => {
    google.mockCreateBackupSchedule(
      Promise.reject('error creating backup schedule')
    );

    // Setup a mock Firestore document snapshot
    const mockSnapshot = {
      data: () => ({
        timestamp: Timestamp.now(),
        destinationDatabaseId: 'test-database',
      }),
      ref: {
        update: jest.fn(),
      },
    };

    // Call the function with the mock snapshot
    await triggerRestorationJobHandler(mockSnapshot as any);

    expect(mockSnapshot.ref.update).toHaveBeenCalledWith({
      status: {
        message: RestoreStatus.FAILED,
        error: `${RestoreError.EXCEPTION}: error creating backup schedule`,
      },
      updated: expect.anything(),
    });
  });
});
