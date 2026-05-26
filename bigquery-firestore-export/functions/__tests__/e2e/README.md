# BigQuery-Firestore Export Extension E2E Tests

This directory contains end-to-end (E2E) tests for the BigQuery-Firestore Export Firebase extension. These tests verify the extension's behavior with live BigQuery and Firestore services, particularly focusing on reconfiguration scenarios.

## Overview

The E2E tests are designed to:
- Test the full extension lifecycle (installation, configuration, reconfiguration)
- Verify data transfer from BigQuery to Firestore
- Test various reconfiguration scenarios
- Ensure proper error handling
- Validate edge cases like empty partitioning fields

## Prerequisites

### Required Services
- Google Cloud Project with billing enabled
- BigQuery API enabled
- BigQuery Data Transfer API enabled
- Firestore API enabled
- Pub/Sub API enabled

### Required Permissions
Your service account or user credentials need the following roles:
- BigQuery Admin (`roles/bigquery.admin`)
- Cloud Datastore User (`roles/datastore.user`)
- Pub/Sub Admin (`roles/pubsub.admin`)

### Authentication
You can authenticate in one of these ways:
1. **Service Account Key** (Recommended for CI/CD):
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   ```

2. **Application Default Credentials** (For local development):
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

## Setup Instructions

### 1. Create Environment Configuration

Copy the example environment file and fill in your values:

```bash
cp __tests__/e2e/.env.e2e.test.example __tests__/e2e/.env.e2e.test
```

Edit `.env.e2e.test`:
```env
E2E_PROJECT_ID=your-test-project-id
E2E_LOCATION=us-central1
E2E_BIGQUERY_DATASET_LOCATION=US
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

## Running Tests

### Run All E2E Tests Locally

```bash
npm run test:e2e:local
```

### Run Specific Test Suites

```bash
# Run only reconfiguration tests
npm run test:e2e:local -- reconfiguration

# Run with verbose output
npm run test:e2e:local -- --verbose

# Run specific test
npm run test:e2e:local -- -t "should update query without affecting schedule"
```

### Run in CI Environment

```bash
npm run test:e2e:ci
```

## Test Structure

```
__tests__/e2e/
├── config.e2e.ts              # E2E test configuration
├── utils.e2e.ts               # Utility functions for tests
├── reconfiguration.e2e.test.ts # Main reconfiguration test suite
├── fixtures/                  # Test data and fixtures
│   ├── schemas.ts            # BigQuery table schemas
│   ├── queries.ts            # Sample queries
│   └── data-generators.ts    # Test data generators
├── setup.local.ts            # Local environment setup
├── setup.ci.ts               # CI environment setup
├── .env.e2e.test.example     # Environment template
└── README.md                 # This file
```

## Test Scenarios

### Initial Configuration
- Creating transfer config on first install
- Writing config to Firestore
- Scheduling query execution

### Query String Reconfiguration
- Updating query without affecting schedule
- Handling complex query changes
- Validating query syntax

### Schedule Reconfiguration
- Updating schedule frequency
- Changing schedule formats
- Maintaining data consistency

### Table and Dataset Reconfiguration
- Updating destination tables
- Handling dataset changes
- Preserving historical data

### Partitioning Field Reconfiguration
- Adding partitioning to non-partitioned tables
- Handling empty partitioning fields (bug #2544)
- Changing partitioning fields

### Multiple Sequential Reconfigurations
- Rapid configuration changes
- Data consistency across changes
- Concurrent reconfiguration handling

### Error Handling
- Invalid query strings
- Missing resources
- Network interruptions

## Debugging

### View Test Logs

Tests output detailed logs. To see more information:

```bash
# Run with debug logging
DEBUG=* npm run test:e2e:local

# Run single test with maximum verbosity
npm run test:e2e:local -- --verbose --detectOpenHandles -t "test name"
```

### Keep Test Resources for Debugging

By default, test resources are cleaned up after each test. To keep them:

1. Set in environment:
   ```bash
   E2E_RUN_CLEANUP=false npm run test:e2e:local
   ```

2. Or comment out cleanup in tests:
   ```typescript
   afterEach(async () => {
     // await cleanupTestResources(...);
   });
   ```

**Important:** Remember to manually clean up resources to avoid costs!

### Manual Resource Cleanup

If tests fail and leave resources behind:

```bash
# List datasets
bq ls --project_id=YOUR_PROJECT_ID | grep e2e_test_

# Delete dataset
bq rm -r -f -d YOUR_PROJECT_ID:dataset_name

# List topics
gcloud pubsub topics list --project=YOUR_PROJECT_ID | grep e2e-test-

# Delete topic
gcloud pubsub topics delete TOPIC_NAME --project=YOUR_PROJECT_ID
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on:
  push:
    branches: [main]
  pull_request:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run E2E tests
        env:
          E2E_PROJECT_ID: ${{ secrets.E2E_PROJECT_ID }}
          E2E_LOCATION: us-central1
          E2E_BIGQUERY_DATASET_LOCATION: US
          GOOGLE_APPLICATION_CREDENTIALS: /tmp/gcp-key.json
        run: |
          echo '${{ secrets.GCP_SA_KEY }}' > /tmp/gcp-key.json
          npm run test:e2e:ci
```

## Cost Considerations

E2E tests use live Google Cloud services which incur costs:
- BigQuery: Storage and query processing
- Firestore: Document reads/writes
- Pub/Sub: Message publishing
- Data Transfer Service: Transfer config operations

To minimize costs:
1. Use small datasets for testing
2. Clean up resources promptly
3. Run tests in the same region as your services
4. Use a dedicated test project with budget alerts

## Troubleshooting

### Common Issues

#### Authentication Errors
```
Error: Could not load the default credentials
```
**Solution:** Set up authentication as described in Prerequisites.

#### Permission Denied
```
Error: Permission 'bigquery.transfers.create' denied
```
**Solution:** Ensure your account has the required roles.

#### Resource Already Exists
```
Error: Dataset e2e_test_xyz already exists
```
**Solution:** Clean up orphaned resources or use unique names.

#### Timeout Errors
```
Error: Timeout - Async callback was not invoked within the 120000ms timeout
```
**Solution:** Increase timeout in jest.e2e.config.js or optimize test data size.

### Getting Help

1. Check test logs for detailed error messages
2. Verify all prerequisites are met
3. Ensure Google Cloud services are enabled
4. Check service status: https://status.cloud.google.com/
5. File an issue with reproduction steps

## Best Practices

1. **Isolation**: Each test uses unique resource names to avoid conflicts
2. **Cleanup**: Always clean up test resources to avoid costs
3. **Idempotency**: Tests should be runnable multiple times
4. **Timeouts**: Set appropriate timeouts for BigQuery operations
5. **Error Handling**: Test both success and failure scenarios
6. **Documentation**: Document any special setup or considerations

## Contributing

When adding new E2E tests:

1. Follow the existing test structure
2. Add appropriate fixtures and data generators
3. Document new test scenarios in this README
4. Ensure tests clean up all resources
5. Test locally before submitting PR
6. Update CI configuration if needed

## License

Copyright 2025 Google LLC. Licensed under the Apache License, Version 2.0.