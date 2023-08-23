import * as firestore from "@google-cloud/firestore";
import config from "./config";
import { logger } from "firebase-functions/v1";

const client = new firestore.v1.FirestoreAdminClient({
  projectId: config.projectId,
});

export async function WaitForExportCompletion(name: string) {
  logger.log("Checking for export progress: ", name);
  const response = await client.checkExportDocumentsProgress(name);
  if (!response.done) {
    // Wait for a bit before retrying
    await new Promise((resolve) => setTimeout(resolve, 60000));
    /** try again */
    await WaitForExportCompletion(name);
  }
  return Promise.resolve(response);
}

export async function createExport() {
  const { projectId, backupCollectionName, bucketName } = config;
  const name = client.databasePath(projectId, "(default)");
  const id = new Date().valueOf();

  /** Start backup */
  const [operation] = await client.exportDocuments({
    name,
    outputUriPrefix: `gs://${bucketName}/backups/${id}`,
    collectionIds:
      backupCollectionName === "**" ? [] : backupCollectionName.split(","),
  });

  return { id, operation };
}
