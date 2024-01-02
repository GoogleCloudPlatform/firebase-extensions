import {google, firestore_v1 as firestore} from 'googleapis';

// Mock implementation for getAuthClient
const mockGetClient = jest.fn().mockResolvedValue({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Replace google.auth.getClient with mockGetClient
google.auth.getClient = mockGetClient;

// Type for the mock backup data array using the actual type from googleapis
let mockBackupData: firestore.Schema$GoogleFirestoreAdminV1Backup[] = [];
let mockBackupSchedulesData: firestore.Schema$GoogleFirestoreAdminV1BackupSchedule[] =
  [];
let mockBackupScheduleData: firestore.Schema$GoogleFirestoreAdminV1BackupSchedule;

// Setter function to update mock data
const __setMockBackupData = (
  data: firestore.Schema$GoogleFirestoreAdminV1Backup[]
) => {
  mockBackupData = data;
};

const __setMockBackupSchedulesData = (
  data: firestore.Schema$GoogleFirestoreAdminV1BackupSchedule[]
) => {
  mockBackupSchedulesData = data;
};

const __setMockBackupScheduleData = (
  data: firestore.Schema$GoogleFirestoreAdminV1BackupSchedule
) => {
  mockBackupScheduleData = data;
};

class MockFirestore {
  // Mock implementation for projects.locations.backups.list
  projects = {
    locations: {
      backups: {
        list: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            data: {
              backups: mockBackupData,
            },
          });
        }),
      },
    },
    databases: {
      backupSchedules: {
        create: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            data: mockBackupScheduleData,
          });
        }),
        list: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            data: {
              backupSchedules: mockBackupSchedulesData,
            },
          });
        }),
      },
    },
  };
}

// Export the mocked modules
export const firestore_v1 = {
  ...firestore,
  Firestore: MockFirestore,
};

export {google};
export {
  __setMockBackupData,
  __setMockBackupSchedulesData,
  __setMockBackupScheduleData,
};
