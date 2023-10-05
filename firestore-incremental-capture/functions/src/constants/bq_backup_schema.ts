export const bqBackupSchema = [
  {name: 'documentId', type: 'STRING', mode: 'REQUIRED'},
  {name: 'documentPath', type: 'STRING', mode: 'REQUIRED'},
  {name: 'beforeData', type: 'JSON'},
  {name: 'afterData', type: 'JSON'},
  {name: 'changeType', type: 'STRING', mode: 'REQUIRED'},
  {name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED'},
];
