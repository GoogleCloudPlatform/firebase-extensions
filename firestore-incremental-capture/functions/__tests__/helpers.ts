import { DocumentReference, DocumentSnapshot } from "firebase-admin/firestore";
import { WrappedFirebaseFunction } from "./types";
import { FeaturesList } from "firebase-functions-test/lib/features";

const { BigQuery } = require("@google-cloud/bigquery");
const bq = new BigQuery({ projectId: "dev-extensions-testing" });

export const simulateFunctionTriggered =
  (
    module: FeaturesList,
    wrappedFunction: WrappedFirebaseFunction,
    collectionName: string
  ) =>
  async (ref: DocumentReference, before?: DocumentSnapshot) => {
    const data = (await ref.get()).data() as { [key: string]: any };
    const beforeFunctionExecution = module.firestore.makeDocumentSnapshot(
      data,
      `${collectionName}/${ref.id}`
    ) as DocumentSnapshot;
    const change = module.makeChange(before, beforeFunctionExecution);
    await wrappedFunction(change);
    return beforeFunctionExecution;
  };

export const clearBQTables = async () => {
  const [datasets] = await bq.getDatasets({
    projectId: "dev-extensions-testing",
  });

  for await (const dataset of datasets) {
    try {
      await dataset.delete({ force: true });
      console.log(`Dataset ${dataset.id} deleted.`);
    } catch (ex) {}
  }
};
