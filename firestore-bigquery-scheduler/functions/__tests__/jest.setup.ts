const path = require("path");

(async function () {
  require("dotenv").config({
    path: path.resolve(
      __dirname,
      "../../../extensions/firestore-bigquery-scheduler.env"
    ),
  });

  process.env.EXT_INSTANCE_ID = "firestore-bigquery-scheduler";

  process.env.GCLOUD_PROJECT = "dev-extensions-testing";
  process.env.PROJECT_ID = "dev-extensions-testing";
})();
