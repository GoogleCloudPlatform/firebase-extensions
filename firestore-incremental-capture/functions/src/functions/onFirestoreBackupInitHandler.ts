import { getExtensions } from "firebase-admin/extensions";

import { logger } from "firebase-functions/v1";
import { updateStatus } from "../database";
import { exportToBQ } from "../bigquery";
import { WaitForExportCompletion } from "../export";

export const onFirestoreBackupInitHandler = async (data: any) => {
  const { id, name } = data;
  const runtime = getExtensions().runtime();

  /** Update the status */
  await runtime.setProcessingState(
    "NONE",
    "Waiting for the export to be completed"
  );

  try {
    /** Start polling for updates */
    await WaitForExportCompletion(name);

    /** Update the database status */
    await updateStatus(id, {
      status: "exporting to BQ...",
    });

    /** Export to BQ */
    logger.info(`Exporting to BQ: ${id}`);
    await exportToBQ(id);

    /** Set status to completed */
    await updateStatus(id, {
      status: "Completed",
    });

    /** Update the status */
    await runtime.setProcessingState(
      "PROCESSING_COMPLETE",
      "Successfully backed up to Firestore"
    );
  } catch (ex) {
    logger.error("Error backing up to BQ", ex);
    await updateStatus(id, {
      status: "Error",
      //@ts-ignore
      error: ex.message,
    });
    await runtime.setProcessingState(
      "PROCESSING_FAILED",
      "Error backing up to Firestore"
    );

    return Promise.resolve();
  }

  return Promise.resolve();
};
