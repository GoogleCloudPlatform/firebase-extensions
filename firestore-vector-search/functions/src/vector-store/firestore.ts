import {Query, VectorQuery} from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import {Prefilter} from '../queries/util';
import {VectorStoreClient} from './base_class';
import {FirebaseFirestoreError} from 'firebase-admin/firestore';
import {HttpsError} from 'firebase-functions/https';

export class FirestoreVectorStoreClient extends VectorStoreClient {
  firestore: admin.firestore.Firestore;
  distanceMeasure: 'COSINE' | 'EUCLIDEAN' | 'DOT_PRODUCT';
  constructor(
    firestore: admin.firestore.Firestore,
    distanceMeasure: 'COSINE' | 'EUCLIDEAN' | 'DOT_PRODUCT' = 'COSINE'
  ) {
    super(firestore);
    this.firestore = firestore;
    this.distanceMeasure = distanceMeasure;
  }

  // Converts thrown Firestore or general errors into structured HttpsError objects
  private toHttpsError(error: any, context?: string): HttpsError {
    if (error instanceof HttpsError) {
      return error;
    }

    if (error instanceof FirebaseFirestoreError) {
      const message = context || error.message;

      switch (error.code) {
        case 'cancelled':
          return new HttpsError('cancelled', message);
        case 'unknown':
          return new HttpsError('unknown', message);
        case 'invalid-argument':
          return new HttpsError('invalid-argument', message);
        case 'deadline-exceeded':
          return new HttpsError('deadline-exceeded', message);
        case 'not-found':
          return new HttpsError('not-found', message);
        case 'already-exists':
          return new HttpsError('already-exists', message);
        case 'permission-denied':
          return new HttpsError('permission-denied', message);
        case 'resource-exhausted':
          return new HttpsError('resource-exhausted', message);
        case 'failed-precondition':
          return new HttpsError('failed-precondition', message);
        case 'aborted':
          return new HttpsError('aborted', message);
        case 'out-of-range':
          return new HttpsError('out-of-range', message);
        case 'unimplemented':
          return new HttpsError('unimplemented', message);
        case 'internal':
          return new HttpsError('internal', message);
        case 'unavailable':
          return new HttpsError('unavailable', message);
        case 'data-loss':
          return new HttpsError('data-loss', message);
        case 'unauthenticated':
          return new HttpsError('unauthenticated', message);
        default:
          return new HttpsError('unknown', message);
      }
    }

    if (error instanceof Error) {
      if (error.message.toLowerCase().includes('opstr')) {
        return new HttpsError(
          'invalid-argument',
          context
            ? `Invalid operator in query: ${context}`
            : 'Invalid operator in Firestore query'
        );
      }

      return new HttpsError('unknown', error.message);
    }

    return new HttpsError(
      'unknown',
      'An unexpected error occurred performing your query'
    );
  }

  async query(
    query: number[],
    collection: string,
    prefilters: Prefilter[],
    limit: number,
    outputField: string
  ): Promise<{ids: string[]}> {
    try {
      const collectionRef = this.firestore.collection(collection);
      let q: Query | VectorQuery = collectionRef;

      if (prefilters.length > 0) {
        for (const p of prefilters) {
          try {
            q = q.where(p.field, p.operator, p.value);
          } catch (filterError) {
            throw this.toHttpsError(
              filterError,
              `${p.operator} for ${p.field}`
            );
          }
        }
      }

      try {
        q = q.findNearest(outputField, query, {
          limit,
          distanceMeasure: this.distanceMeasure,
        });
      } catch (findNearestError) {
        throw this.toHttpsError(findNearestError);
      }

      const result = await q.get();
      return {ids: result.docs.map(doc => doc.ref.id)};
    } catch (error) {
      throw this.toHttpsError(error);
    }
  }
}
