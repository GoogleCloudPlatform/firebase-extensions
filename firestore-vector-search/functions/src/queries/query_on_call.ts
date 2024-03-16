import { config } from "../config";
import * as functions from "firebase-functions";
import { embeddingClient } from "../embeddings/client";
import { textVectorStoreClient } from "../vector-store";
import { parseQuerySchema, parseLimit, Prefilter } from "./util";

// TODO: remove any
export async function handleQueryCall(data: unknown, context: any) {
  if (!context.auth) {
    // Throwing an error if the user is not authenticated.
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }
  const queryParams = parseQuerySchema(data);
  const text = queryParams["query"]!;
  const limitParam = queryParams["limit"];

  const prefilters: Prefilter[] = queryParams["prefilters"] || [];

  const limit = limitParam ? parseLimit(limitParam) : config.defaultQueryLimit;

  await embeddingClient.initialize();

  const textQueryEmbedding = await embeddingClient.getSingleEmbedding(text);

  // query firestore for the documents

  return await textVectorStoreClient.query(
    textQueryEmbedding,
    config.collectionName,
    prefilters,
    limit,
    config.outputField
  );
}
