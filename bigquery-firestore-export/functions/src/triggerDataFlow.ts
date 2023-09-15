import config from "./config";import { TemplatesServiceClient} from "@google-cloud/dataflow";

const dataflowClient = new TemplatesServiceClient();

interface LaunchJobOptions {
  query: string;
}

export async function launchJob(options: LaunchJobOptions) {

  const projectId = config.projectId;

  const request = {
    projectId,
    gcsPath: config.templateLocation,
    launchParameters: {
      jobName: `${config.instanceId}-dataflow-job-${Date.now()}`,
      parameters: {
        query: options.query
      }
    } as any,
  };

  const [response] = await dataflowClient.launchTemplate(request);

  console.log(`Launched job ${response.job?.id}`);
}