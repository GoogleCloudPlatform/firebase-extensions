# Migrating from 0.1.x to 0.2.0

Version 0.2.0 introduces changes to how transfer run results are recorded in Firestore. While the extension remains functionally compatible, the logic for handling the "latest" run document has been updated to improve reliability and error visibility.

## 1. Updated "Latest" Document Behavior

In previous versions, the `latest` document (`transferConfigs/{configId}/runs/latest`) was primarily updated upon a successful data export.

**Changes in 0.2.0:**

- The document is now updated for every completed run, including those with a `FAILED` or `CANCELLED` state.
- Updates are handled via Firestore transactions to ensure data consistency during concurrent runs.

**Action Required:**

If your application uses a real-time listener on the `latest` document, you must update your logic to check the job status before rendering results.

```javascript
// Example update for client-side logic
db.doc('transferConfigs/YOUR_CONFIG_ID/runs/latest').onSnapshot((doc) => {
  const data = doc.data();
  // NEW: Check state before processing row counts or results
  if (data.runMetadata.state === 'SUCCEEDED') {
    renderResults(data.totalRowCount);
  } else {
    handleFailure(data.runMetadata.state);
  }
});
```

## 2. Explicit Row Counts on Failure

When a transfer run fails or does not complete successfully, the extension now explicitly sets `totalRowCount` and `failedRowCount` to `0`.

**Action Required:**

Ensure your frontend distinguishes between a successful run with no data and a failed run by checking the `runMetadata.state` field first. A `totalRowCount` of `0` could mean either:
- The BigQuery query succeeded but returned zero rows
- The transfer run failed

Always verify `runMetadata.state === 'SUCCEEDED'` before interpreting row counts.

## 3. New Configuration Parameter

A `LOG_LEVEL` parameter has been added.

- During upgrade, the default is set to `INFO`.
- If you require more granular data for troubleshooting, you may switch this to `DEBUG` in the Firebase Console.
- Available options: `DEBUG`, `INFO`, `WARN`, `ERROR`, `SILENT`

## 4. Automated Pub/Sub Topic Management

Version 0.2.0 removes the `PUB_SUB_TOPIC` configuration parameter.

**What Changed:**
- The extension now automatically creates and manages its Pub/Sub topic using the naming convention: `ext-{INSTANCE_ID}-processMessages`
- During upgrade, your BigQuery Transfer Configs are automatically reconfigured to use the new topic

**Action Required:**
- **None for the upgrade itself** — the transition is handled automatically
- **Optional cleanup**: After verifying that new transfer runs work correctly, you may delete your old Pub/Sub topic from the Google Cloud Console to avoid orphaned resources

## 5. Verification

After upgrading, trigger a manual run of your BigQuery Transfer Config to verify the migration:

1. Go to [BigQuery Scheduled Queries](https://console.cloud.google.com/bigquery/scheduled-queries) and run your transfer config manually.
2. Check your Firestore collection at `transferConfigs/{configId}/runs/latest`.
3. Verify that the `latest` document contains the `runMetadata.state` field.
4. If you set `LOG_LEVEL` to `DEBUG`, check the Firebase Function logs to see the transactional update logic executing.

## Support

If you encounter issues during migration, please [open an issue](https://github.com/GoogleCloudPlatform/firebase-extensions/issues) on the repository.
