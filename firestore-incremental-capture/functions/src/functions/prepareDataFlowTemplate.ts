import {exec} from 'child_process';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import config from '../config';

const bucket = admin.storage().bucket();

function executeMavenCommand(): Promise<string> {
  return new Promise((resolve, reject) => {
    const cmd = `mvn clean package -DskipTests -Dexec.mainClass=com.pipeline.RestorationPipeline 
                -Dexec.args="--runner=DataflowRunner --project=${config.projectId} --region=${config.location} --tempLocation=gs://${config.bucketName}/tmp"`;
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

async function uploadToFirebaseStorage(filePath: string) {
  const destination = 'pipeline/my-pipeline.jar';

  await bucket.upload(filePath, {
    destination: destination,
    gzip: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
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
