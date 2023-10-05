import config from '../config';

import {exec} from 'child_process';

/**
 * This function builds the flex template for the dataflow job,
 * but it is not used in the current implementation.
 * The reason is that gcloud CLI is not available in the cloud functions runtime,
 * hence the build process cannot be automated.
 *
 * It is included here for reference purposes.
 */
export async function buildFlexTemplateHandler() {
  const projectId = config.projectId;
  const bucketName = config.bucketName;
  const location = config.location;
  const instanceId = config.instanceId;

  exec('sudo apt-get update && sudo apt-get install google-cloud-cli', err => {
    if (err) {
      console.log(err);
      Promise.reject(err);
    }

    exec(
      `gcloud dataflow flex-template build gs://${bucketName}/dataflow-templates/${instanceId}.json \
          --image-gcr-path "${location}-docker.pkg.dev/${projectId}/${instanceId}:latest" \
          --sdk-language "JAVA" \
          --flex-template-base-image JAVA11 \
          --jar "target/restore-1.0.jar" \
          --env FLEX_TEMPLATE_JAVA_MAIN_CLASS="com.pipeline.RestorationPipeline"`,
      (err, stdout) => {
        if (err) {
          console.log(err);
          Promise.reject(err);
        }

        Promise.resolve(stdout);
      }
    );
  });
}
