import * as functionsv2 from "firebase-functions/v2";
import config from "../config";

export const onExportConfig = {
  retry: false,
  eventType: "google.cloud.audit.log.v1.written",
  serviceAccount: `ext-${config.instanceId}@${config.projectId}.iam.gserviceaccount.com`,
};

export const onExportHandler = (event: any) => {
  const { operation } = event.data;

  functionsv2.logger.info("EVENT RECEIVED", event);

  if (!operation) return;

  return;
};
