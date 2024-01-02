import {google, firestore_v1 as firestore} from 'googleapis';

// Mock implementation for getAuthClient
const mockGetClient = jest.fn().mockResolvedValue({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Replace google.auth.getClient with mockGetClient
google.auth.getClient = mockGetClient;

// Type for the mock backup data array using the actual type from googleapis
let mockBackupData: firestore.Schema$GoogleFirestoreAdminV1Backup[] = [];

// Mock implementation for backups.list
// Mock implementation for backups.list
const mockListBackups = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    data: {
      backups: [
        // Your mock backup data
      ],
    },
  });
});

// Setter function to update mock data
export const __setMockBackupData = (
  data: firestore.Schema$GoogleFirestoreAdminV1Backup[]
) => {
  mockBackupData = data;
};

class MockFirestore {
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

  // ... other mock implementations
}

// Export the mocked modules
export const firestore_v1 = {
  ...firestore,
  Firestore: MockFirestore,
};

export {google};
