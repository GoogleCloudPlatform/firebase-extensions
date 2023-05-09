module.exports = async function () {
  delete process.env.LOCATION;
  delete process.env.BIGQUERY_DATASET_LOCATION;
  delete process.env.TRANSFER_CONFIG_NAME;
  delete process.env.DISPLAY_NAME;
  delete process.env.DATASET_ID;
  delete process.env.TABLE_NAME;
  delete process.env.QUERY_STRING;
  delete process.env.PARTITIONING_FIELD;
  delete process.env.SCHEDULE;
  delete process.env.PUB_SUB_TOPIC;
  delete process.env.FIRESTORE_COLLECTION;
  delete process.env.EXT_INSTANCE_ID;
  delete process.env.PROJECT_ID;
};
