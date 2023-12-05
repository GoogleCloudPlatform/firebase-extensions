import {firestore} from 'firebase-admin';
import {RestoreStatus} from './restore_status';
import * as google from 'googleapis';

export interface RestoreJobInfo {
  status: {
    message: RestoreStatus;
    error?: string;
  };
  operation?: google.firestore_v1.Schema$GoogleLongrunningOperation;
  updated?: firestore.Timestamp;
}
