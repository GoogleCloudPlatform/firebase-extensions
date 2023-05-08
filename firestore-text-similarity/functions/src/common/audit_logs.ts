import { v3 } from "@google-cloud/resource-manager";
import * as functions from "firebase-functions";

import config from "../config";

// Instantiates a client
const resourcemanagerClient = new v3.OrganizationsClient({
  scopes: [
    "https://www.googleapis.com/auth/cloud-platform",
    "https://www.googleapis.com/auth/cloudplatformprojects",
  ],
});

// requires the following permissions:
// - resourcemanager.projects.setIamPolicy
// - resourcemanager.projects.getIamPolicy
// https://cloud.google.com/iam/docs/understanding-roles#resourcemanager.projectIamAdmin

export async function enableAuditLogsVertexAI(): Promise<void> {
  // Set the project ID and the parent resource
  const projectId = config.projectId;
  const parent = `projects/${projectId}`;

  // Set the audit log config for Vertex AI API
  const auditLogConfig = {
    service: "aiplatform.googleapis.com",
    logTypes: ["DATA_READ", "DATA_WRITE"],
  };

  try {
    const response = await resourcemanagerClient.getIamPolicy({
      resource: parent,
    });

    functions.logger.log("Audit logs response", response);

    if (!response[0].bindings) {
      response[0].auditConfigs = [auditLogConfig];
    } else {
      const policyExists = response[0].auditConfigs?.find(
        (auditConfig) => auditConfig.service === "aiplatform.googleapis.com"
      );

      if (policyExists) {
        functions.logger.info(
          "Audit logs already enabled for Vertex AI API, skipping."
        );
        return;
      }

      response[0].auditConfigs = [auditLogConfig];
    }

    const request = {
      resource: parent,
      requestBody: {
        policy: response[0],
      },
    };

    await resourcemanagerClient.setIamPolicy(request);
    functions.logger.log("Audit logs is now enabled for Vertex AI API.");
  } catch (error) {
    functions.logger.error(
      "Error enabling audit logs for Vertex AI API",
      error
    );
    throw error;
  }
}
