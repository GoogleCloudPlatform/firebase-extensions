import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getFunctions } from "firebase-admin/functions";

import config from "../config";
import { AxiosError } from "axios";
import * as utils from "../common/utils";
import { IndexStatus } from "../types/index_status";
import { getDatapoint } from "../common/datapoints";
import {
  checkIndexStatus,
  createIndex,
  upsertDatapoint,
} from "../common/vertex";
import { backfillTriggerHandler } from "./backfill_trigger";

export async function streamUpdateDatapointHandler(
  snap: FirebaseFirestore.DocumentSnapshot
) {
  const indexStatus = await checkIndexStatus();
  if (indexStatus !== IndexStatus.DEPLOYED) {
    functions.logger.info("Index not deployed yet, skipping...");
    const queue = getFunctions().taskQueue(
      "datapointWriteTask",
      config.instanceId
    );

    // Index isn't ready yet, retry in an hour.
    await queue.enqueue(
      {
        operation: "remove",
        docId: snap.id,
      },
      {
        scheduleDelaySeconds: 60 * 60,
      }
    );
    return;
  }

  if (!utils.isValidReference(snap.ref)) {
    console.log(`Skipping ${snap.ref.path}`);
    return;
  }

  const data = snap.data();

  if (!data) return;
  if (Object.keys(data).length == 0) return;

  functions.logger.debug("Data to be embedded", { data });
  const datapoint = await getDatapoint(snap.ref, data);

  if (!datapoint) return;
  functions.logger.info("Datapoint generated 🎉");
  try {
    // Get the index name from the metadata document.
    const metdata = await admin.firestore().doc(config.metadataDoc).get();
    const index = metdata.data()?.index;
    if (!index) {
      functions.logger.error("Index not found");
      return;
    }

    functions.logger.info("Upserting datapoint to index", datapoint);

    try {
      // Upsert the datapoint to the index.
      await upsertDatapoint(index, [
        {
          datapoint_id: datapoint.id,
          feature_vector: datapoint.embedding,
        },
      ]);
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        functions.logger.error(
          "Index not found, creating a new one and retrying..."
        );

        await backfillTriggerHandler();

        return;
      } else {
        throw error;
      }
    }
  } catch (error) {
    functions.logger.error((error as AxiosError).response);
  }
}
