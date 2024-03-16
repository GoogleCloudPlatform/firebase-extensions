import * as admin from "firebase-admin";
import { Prefilter } from "../queries/util";

export class VectorStoreClient {
  firestore: admin.firestore.Firestore;
  constructor(firestore: admin.firestore.Firestore) {
    this.firestore = firestore;
  }
  async query(
    query: number[],
    collection: string,
    prefilters: Prefilter[],
    limit: number,
    outputField: string
  ): Promise<string[]> {
    throw new Error("Not implemented");
  }

  // TODO: not sure if the native API will need this or not?
  async createIndex(collectionName: string): Promise<any> {
    // throw new Error("Not implemented");
  }

  async upsert(
    datapoints: { embedding: number[]; id: string }[]
  ): Promise<void> {}
}
