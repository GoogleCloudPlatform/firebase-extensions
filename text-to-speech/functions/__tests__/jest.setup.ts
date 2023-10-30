import * as dotenv from 'dotenv';
const path = require('path');

(async function () {
  dotenv.config({
    path: path.resolve(
      __dirname,
      '../../../_emulator/extensions/firestore-text-to-speech.env.local'
    ),
  });

  process.env.EXT_INSTANCE_ID = 'firestore-text-to-speech';
  process.env.GOOGLE_CLOUD_PROJECT = 'demo-gcp';
  process.env.GCLOUD_PROJECT = 'demo-gcp';
  process.env.PROJECT_ID = 'demo-gcp';
})();
