import {Query, VectorQuery} from '@google-cloud/firestore';
import * as admin from 'firebase-admin';
import {Prefilter} from '../queries/util';
import {VectorStoreClient} from './base_class';
import {FirebaseFirestoreError} from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/https'

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

  // Converts thrown error: any to an HttpsError for the function to throw
  private toHttpsError(error: any, context?: string): HttpsError {

    if (error instanceof HttpsError) {
      return error
    }

    // convert firestore errors to functions errors for our function to throw
    if (error instanceof FirebaseFirestoreError) {
      switch(error.code) {
        case 'firestore/invalid-argument':
          return new HttpsError('invalid-argument', context || error.message)
          // TODO: other cases
      }
    }

    if (error instanceof Error) {
      // TODO: maybe improve this check
      if (error.message.includes('opStr')) {
        return new HttpsError('invalid-argument', context ? `Invalid operator in query: ${context}` : `Invalid operator in query`)
      }
    }

    return new HttpsError('unknown', 'An unexpected error occured performing your query')

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
            throw this.toHttpsError(filterError, `${p.operator} for ${p.field}`)
        }
      }
    }
    try {
      q = q.findNearest(outputField, query, {
        limit,
        distanceMeasure: this.distanceMeasure,
      });
    } catch (findNearestError) {
      this.toHttpsError(findNearestError)
    }
      const result = await q.get();
      return {ids: result.docs.map(doc => doc.ref.id)};
    } catch (error) {
      throw this.toHttpsError(error)
    }   
  }
}

