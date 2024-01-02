import {google, firestore_v1 as firestore} from 'googleapis';

// Mock implementation for getAuthClient
const mockGetClient = jest.fn().mockResolvedValue({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Replace google.auth.getClient with mockGetClient
google.auth.getClient = mockGetClient;

// Type for the mock backup data array using the actual type from googleapis
let mockBackupData: firestore.Schema$GoogleFirestoreAdminV1Backup[] = [];

// Setter function to update mock data
const __setMockBackupData = (
  data: firestore.Schema$GoogleFirestoreAdminV1Backup[]
) => {
  mockBackupData = data;
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
  };

  __setMockBackupData = __setMockBackupData;
}

// Export the mocked modules
export const firestore_v1 = {
  ...firestore,
  Firestore: MockFirestore,
};

export {google};
export {__setMockBackupData};
