export const syncMessage = (name: string) => {
  return {
    failedRowCount: 0,
    totalRowCount: 1,
    runMetadata: {
      scheduleTime: '2023-03-23T21:03:00Z',
      destinationDatasetId: 'test',
      emailPreferences: {},
      updateTime: '2023-03-23T21:04:16.167248Z',
      params: {
        destination_table_name_template: 'test_{run_time|"%H%M%S"}',
        query: 'SELECT * FROM `jeff-glm-testing.test.test`',
        write_disposition: 'WRITE_TRUNCATE',
        partitioning_field: '',
      },
      userId: '-1291228896441774269',
      schedule: 'every 15 minutes',
      dataSourceId: 'scheduled_query',
      name,
      errorStatus: {},
      startTime: '2023-03-23T21:03:01.133872Z',
      endTime: '2023-03-23T21:04:16.167236Z',
      runTime: '2023-03-23T21:03:00Z',
      state: 'SUCCEEDED',
      notificationPubsubTopic: 'projects/jeff-glm-testing/topics/test',
    },
  };
};
