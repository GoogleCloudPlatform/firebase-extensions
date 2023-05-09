/* eslint-disable node/no-missing-require */
const admin = require('firebase-admin');
const {PubSub} = require('@google-cloud/pubsub');

if (!admin.apps.length) {
  admin.initializeApp();
}

const pubsub = new PubSub({
  apiEndpoint: '127.0.0.1:8085', // Change it to your PubSub emulator address and port
});

const message = {
  dataSourceId: 'scheduled_query',
  destinationDatasetId: 'test',
  emailPreferences: {},
  endTime: '2023-03-23T21:04:16.167236Z',
  errorStatus: {},
  name: 'projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6/runs/643a5797-0000-2e33-8022-f403043645da',
  notificationPubsubTopic: 'projects/jeff-glm-testing/topics/test',
  params: {
    destination_table_name_template: 'test_{run_time|"%H%M%S"}',
    partitioning_field: '',
    query: 'SELECT * FROM `jeff-glm-testing.test.test`',
    write_disposition: 'WRITE_TRUNCATE',
  },
  runTime: '2023-03-23T21:03:00Z',
  schedule: 'every 15 minutes',
  scheduleTime: '2023-03-23T21:03:00Z',
  startTime: '2023-03-23T21:03:01.133872Z',
  state: 'SUCCEEDED',
  updateTime: '2023-03-23T21:04:16.167248Z',
  userId: '-1291228896441774269',
};

const main = async () => {
  const FUNCTION_TOPIC = 'test';
  try {
    await pubsub.createTopic(FUNCTION_TOPIC);
  } catch (err) {
    // pass
  }
  console.log(`Trigger sheduled function via PubSub topic: ${FUNCTION_TOPIC}`);
  await pubsub.topic(FUNCTION_TOPIC).publishJSON(message);
};

main();
