import config from './config';
import {CloudBuildClient} from '@google-cloud/cloudbuild';

const cloneStep = {
  name: 'gcr.io/cloud-builders/git',
  args: [
    'clone',
    'https://github.com/GoogleCloudPlatform/firebase-extensions.git',
  ],
};

const checkoutStep = {
  name: 'gcr.io/cloud-builders/git',
  args: ['checkout', '@invertase/dataflow-export-BQ-latest-read'],
  dir: 'firebase-extensions',
};

const buildStep = {
  name: 'maven:3.8.1-openjdk-11',
  args: [
    'mvn',
    'compile',
    'exec:java',
    '-Dexec.mainClass=com.pipeline.ExportPipeline',
    `-Dexec.args=--runner=DataflowRunner --project=${config.projectId} --stagingLocation=${config.stagingLocation} --templateLocation=${config.templateLocation} --region=${config.dataflowRegion}`,
  ],
  dir: 'firebase-extensions/bigquery-firestore-export/functions/pipeline',
};

const client = new CloudBuildClient();

/**
 * Builds the template for the dataflow pipeline, return the LROperation name
 */
export const stageTemplate = async () => {

  const build_id = `${config.instanceId}-dataflow-template-${Date.now()}`;

  const [operation] = await client.createBuild({
    projectId: config.projectId,
    build: {
      name: build_id,
      id: build_id,
      steps: [cloneStep, checkoutStep, buildStep],
    },
  });

  if (operation.error) {
    throw new Error(operation.error.message);
  }
  return operation
};
