import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { getFunctions } from "firebase-admin/functions";

import { BackfillStatus } from "../types/backfill_status";
import { getDatapointsList } from "../common/datapoints";
import * as utils from "../common/utils";
import config from "../config";
import { DocumentData } from "firebase-admin/firestore";

export async function backfillEmbeddingsTaskHandler(data: any) {
  const { id, collectionName, documentIds } = data;

  if (!documentIds || documentIds.length === 0) {
    functions.logger.info(`No document ids found, skipping...`);
    return;
  }

  const taskRef = admin.firestore().doc(`${config.tasksDoc}/enqueues/${id}`);

  const documents: {
    id: string;
    data: any;
  }[] = [];

  await taskRef.update({
    status: "PROCESSING",
  });

  await admin.firestore().runTransaction(async (transaction) => {

    const refs = documentIds.map((id: string) =>
      admin.firestore().collection(collectionName).doc(id)
    );
    const docs = await transaction.getAll<DocumentData>(...refs);

    docs.map((doc) => {
      const data = doc.data();
      if (!data) {
        functions.logger.error(`Document ${doc.ref.path} has no data`);
        return;
      }

      documents.push({
        id: doc.ref.id,
        data,
      });
    });
  });

  const datapoints = await getDatapointsList(documents);

  if (datapoints.length === 0) {
    functions.logger.info(`No datapoints found, skipping...`);
    return;
  }

  const localFilePath = await utils.saveEmbeddingsToTmpFile(datapoints);

  const destinationPath = `datapoints/${id}.json`;

  functions.logger.info(
    `Embeddings will be saved to ${destinationPath} 📝, uploading to the bucket...`
  );

  await utils.uploadToCloudStorage(localFilePath, destinationPath);

  functions.logger.info(
    `Embeddings uploaded to the bucket ${config.bucketName} in ${destinationPath} 🚀`
  );

  await taskRef.update({
    status: "DONE",
    filePath: `gs://${config.bucketName}/${destinationPath}`,
  });

  await utils.deleteTempFiles();

  const tasksDoc = await admin.firestore().doc(config.tasksDoc).get();
  var { totalLength, processedLength } = tasksDoc.data() as any;

  processedLength += documentIds.length;
  await admin
    .firestore()
    .doc(config.tasksDoc)
    .update({
      processedLength: admin.firestore.FieldValue.increment(documentIds.length),
    });

  if (processedLength === totalLength) {
    await admin.firestore().doc(config.tasksDoc).update({
      status: BackfillStatus.DONE,
    });
  } else {
    await _createNextTask(id);
  }
}

async function _createNextTask(prevId: string) {
  const taskNum = prevId.split("task")[1];
  const nextId = `ext-${config.instanceId}-task${parseInt(taskNum) + 1}`;

  functions.logger.info(`Enqueuing the next task ${nextId}`);

  const nextTask = await admin
    .firestore()
    .doc(`${config.tasksDoc}/enqueues/${nextId}`)
    .get();

  const queue = getFunctions().taskQueue(
    `locations/${config.location}/functions/backfillTask`,
    config.instanceId
  );

  await queue.enqueue({
    id: nextId,
    collectionName: config.collectionName,
    documentIds: nextTask.data()?.documentIds,
  });
}
