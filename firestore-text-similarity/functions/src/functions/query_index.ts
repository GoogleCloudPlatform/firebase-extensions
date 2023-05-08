import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { AxiosError } from "axios";

import config from "../config";
import { Query } from "../types/query";
import { queryIndex } from "../common/vertex";
import { getEmbeddings } from "../common/datapoints";

export async function queryIndexHandler(data: any) {
  const { query, neighbours } = data;

  if (!query || typeof query !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with " +
        'one argument "query" containing the query text.'
    );
  }

  const neighboursCount = parseInt(neighbours) || 10;

  const queryEmbeddings = await getEmbeddings(query);
  
  const metadataDoc = admin.firestore().doc(config.metadataDoc);
  const metadata = await metadataDoc.get();
  const { publicEndpointDomainName, indexEndpoint } = metadata.data() || {};


  if (!publicEndpointDomainName || !indexEndpoint) {
    throw new functions.https.HttpsError(
      "not-found",
      "Endpoint or index endpoint is not found."
    );
  }

  try {
    // const metadata = await admin.firestore().doc(config.metadataDoc).get();

    const result = await queryIndex(
      [new Query("0", queryEmbeddings[0])],
      neighboursCount,
      publicEndpointDomainName,
      indexEndpoint.split("/").pop()
    );

    functions.logger.info("Query successful", result);

    return { status: "ok", message: "Query successful", data: result };
  } catch (error) {
    const axiosError = error as AxiosError;
    functions.logger.error("Error querying the index", axiosError.message);
    throw new functions.https.HttpsError(
      "internal",
      "Error querying the index",
      axiosError.message
    );
  }
}
