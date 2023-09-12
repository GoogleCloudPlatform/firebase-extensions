// TODO: add template params according to extension instance config

import * as admin from "firebase-admin";
import { Request } from "firebase-functions/v1";
import { ScheduledEvent } from "firebase-functions/v2/scheduler";
import config from "./config";

function buildTemplateParams() {
  return {
    jobName: `[job-name]`,
    parameters: {
    //   bigtableProjectId: projectId,
      bigtableInstanceId: "[table-instance]",
    //   bigtableTableId: table,
      outputDirectory: `[gs://your-instance]`,
    //   filenamePrefix: `${table}-`,
    },
    environment: {
      zone: "us-west1-a" // omit or define your own,
    //   tempLocation: `[gs://your-instance/temp]`,
    },
  };
}

export async function triggerDataFlow(params: ScheduledEvent | Request, source: "event" | "http" ) {

  // TODO check if the template is already uploaded to DataFlow
  // TODO check if params is a ScheduledEvent or a Request and just log either way

  const BASE_URL = "https://dataflow.googleapis.com/v1b3/projects";
  // TODO: add in template path according to extension instance config
  const templatePath = "gs://dataflow-templates/latest/template_name";

  // get AccessToken
  const accessToken = await admin.app().options.credential?.getAccessToken();



  const url = `${BASE_URL}/${config.projectId}/templates:launch?gcsPath=${templatePath}`;
  const template = buildTemplateParams();
  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(template),
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("GCP Response", await response.json());
  } catch (error) {
    // console.error(`Failed to execute template for ${table}`, error.message);
  }
}