import {firestore} from 'firebase-admin';

export interface RestoreJobData {
  timestamp: firestore.Timestamp;
  destinationDatabaseId: string;
}
