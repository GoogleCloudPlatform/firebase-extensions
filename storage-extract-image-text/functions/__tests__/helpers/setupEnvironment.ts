export default () => {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  process.env.FIREBASE_FIRESTORE_EMULATOR_ADDRESS = '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  process.env.PUBSUB_EMULATOR_HOST = '127.0.0.1:8085';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199';
  process.env.GOOGLE_CLOUD_PROJECT = 'demo-gcp';
  process.env.GCLOUD_PROJECT = 'demo-gcp';
  process.env.PROJECT_ID = 'demo-gcp';
  process.env.EXT_INSTANCE_ID = 'demo-gcp';
};
