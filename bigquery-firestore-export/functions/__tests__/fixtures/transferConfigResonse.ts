export const getTransferConfigResponse = [
  {
    name: 'projects/409146382768/locations/us/transferConfigs/642f3a36-0000-2fbb-ad1d-001a114e2fa6',
    destinationDatasetId: 'destination_dataset_id',
    displayName: 'Transactions Rollup',
    dataSourceId: 'scheduled_query',
    params: {
      fields: {
        query: {
          stringValue:
            'Select * from `test-project.transaction_data.transactions`',
        },
        destination_table_name_template: {
          stringValue: 'transactions_{run_time|"%H%M%S"}',
        },
        write_disposition: {stringValue: 'WRITE_TRUNCATE'},
        partitioning_field: {stringValue: ''},
      },
    },
    schedule: 'every 15 minutes',
    notificationPubsubTopic: 'projects/test/topics/transfer_runs',
  },
];
