import {createIndex} from './setup';

describe('createIndex', () => {
  const testOptions = {
    collectionName: 'testCollection',
    dimension: 10,
    projectId: 'pfr-cloudnext-demo-ihlt100',
    fieldPath: 'testField',
  }; // Ensure this is your test project ID

  test('should successfully create an index', async () => {
    // Note: This test will actually attempt to create an index.
    // Ensure that your Firestore test project is configured to handle this.
    await expect(createIndex(testOptions)).resolves.toBeDefined();

    // Additional checks can be made here, for example, verifying the structure of the returned result
    // However, since we're not mocking firestoreAdminClient, detailed response checks might be limited
  });

  // You can add more tests here to cover other scenarios, such as handling invalid options.
});
