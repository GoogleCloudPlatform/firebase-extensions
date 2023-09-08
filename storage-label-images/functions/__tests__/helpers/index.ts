const fetch = require('node-fetch');

export const clearFirestore = async (): Promise<void> => {
  await fetch(
    'http://127.0.0.1:8080/emulator/v1/projects/demo-test/databases/(default)/documents',
    {method: 'DELETE'}
  );
};
