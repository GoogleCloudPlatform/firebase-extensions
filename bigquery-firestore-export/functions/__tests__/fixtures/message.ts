export const message = (transferConfigId: string, runId: string) => {
  return {
    json: {
      dataSourceId: 'scheduled_query',
      destinationDatasetId: 'test',
      emailPreferences: {},
      endTime: '2023-03-23T21:04:16.167236Z',
      errorStatus: {},
      name: `projects/409146382768/locations/us/transferConfigs/${transferConfigId}/runs/${runId}`,
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
    },
  };
};
