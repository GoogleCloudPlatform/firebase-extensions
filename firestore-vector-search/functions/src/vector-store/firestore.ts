import { Query, VectorQuery } from "@google-cloud/firestore";
import * as admin from "firebase-admin";
import { Prefilter } from "../queries/util";
import { VectorStoreClient } from "./base_class";

export class FirestoreVectorStoreClient extends VectorStoreClient {
  firestore: admin.firestore.Firestore;
  distanceMeasure: "COSINE" | "EUCLIDEAN" | "DOT_PRODUCT";
  constructor(
    firestore: admin.firestore.Firestore,
    distanceMeasure: "COSINE" | "EUCLIDEAN" | "DOT_PRODUCT" = "COSINE"
  ) {
    super(firestore);
    this.firestore = firestore;
    this.distanceMeasure = distanceMeasure;
  }
  async query(
    query: number[],
    collection: string,
    prefilters: Prefilter[],
    limit: number,
    outputField: string
  ): Promise<string[]> {
    const col = this.firestore.collection(collection);

    let q: Query | VectorQuery = col;

    if (prefilters.length > 0) {
      for (let p of prefilters) {
        q = q.where(p.field, p.operator, p.value);
      }
    }

    q = q.findNearest(outputField, query, {
      limit,
      distanceMeasure: this.distanceMeasure,
    });

    const result = await q.get();

    return result.docs.map((doc) => doc.ref.id);
  }
}
