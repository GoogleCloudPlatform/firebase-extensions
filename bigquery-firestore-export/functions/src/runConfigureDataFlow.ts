import {exec} from 'child_process';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import config from './config';
import {logger} from 'firebase-functions/v1';
import {getExtensions} from 'firebase-admin/extensions';
import {getFunctions} from 'firebase-admin/functions';

const bucket = admin.storage().bucket();

export async function runConfigureDataFlow() {
  /** Setup the db */
  const db = admin.firestore();

  const runtime = getExtensions().runtime();

  const collection = db.collection('bq_export_' + config.instanceId);

  /** Export the Firestore db to storage */
  // const {id, operation} = await createExport();

  //TODO: check all required parts exist (BQ table etc.) and throw if not.

  /** Update Firestore for tracking */
  await collection.doc('metadata').set({
    status: 'Uploading pipeline template...',
  });

  // Upload the DataFlow template to Cloud Storage
  await prepareDataFlowTemplate();

  await collection.doc('metadata').set({
    status: 'Uploaded pipeline template.',
  });

  // Add a cloud task to track the progress of the export
  // const queue = getFunctions().taskQueue(
  //   `locations/${config.location}/functions/onFirestoreBackupInit`,
  //   config.instanceId
  // );

  // return queue.enqueue({
  //   id,
  //   name: operation.name,
  // });
}

/**
 * This function is called when the extension is installed.
 * It will upload the pipeline template to Cloud Storage.
 */
export async function prepareDataFlowTemplate() {
  try {
    await uploadToFirebaseStorage(await executeMavenCommand());
    functions.logger.info('Pipeline template uploaded to Cloud Storage.');
  } catch (error) {
    functions.logger.error(
      'Error uploading pipeline template to Cloud Storage.',
      error
    );
  }
}

async function uploadToFirebaseStorage(filePath: string) {
  const destination = 'pipelines/export-pipeline.jar';

  await bucket.upload(filePath, {
    destination: destination,
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
}

function executeMavenCommand(): Promise<string> {
  return new Promise((resolve, reject) => {

    // we can't do this in a cloud function, so we need to do it locally before publishing the extension maybe
    const cmd = `mvn clean package -DskipTests -Dexec.mainClass=com.pipeline.ExportPipeline 
                  -Dexec.args="--runner=DataflowRunner --project=${config.projectId} --region=${config.location} --tempLocation=gs://${config.bucketName}/tmp --database"`;
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        reject(error);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);

      const artifactId = 'pipeline';
      const version = '1.0-SNAPSHOT';
      const jarPath = `pipeline/target/${artifactId}-${version}.jar`;

      resolve(jarPath);
    });
  });
}
