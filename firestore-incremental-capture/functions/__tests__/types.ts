import {DocumentSnapshot} from 'firebase-admin/firestore';
import {WrappedFunction} from 'firebase-functions-test/lib/v1';
import {Change} from 'firebase-functions/v1';

export type WrappedFirebaseFunction = WrappedFunction<
  Change<DocumentSnapshot | undefined>,
  void
>;
