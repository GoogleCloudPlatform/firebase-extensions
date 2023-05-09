## Try It Out

1. Visit [this link](https://console.cloud.google.com/bigquery/transfers) to see Transfer Configs that have been created. A few moments after the extension has been installed and processing is complete, you should see a Transfer Config matching the Display Name that you created. Grab the Transfer Config ID.
2. View the Firebase document at `${param:COLLECTION_PATH}/{{TRANSFER_CONFIG_ID}}`. This is the metadata associated with the Transfer Config and will be updated if you change the Transfer Config-related extension parameters.
3. View the Firebase subcollection at `${param:COLLECTION_PATH}/{{TRANSFER_CONFIG_ID}}/runs`. When your first transfer run completes, you will see two documents, one with “latest” as the document ID, and another with the transfer run ID as the document ID. 
4. Click into `${param:COLLECTION_PATH}/{TRANSFER_CONFIG_ID}}/runs/{{TRANSFER_RUN_ID}}`. You will see the run metadata stored in that document, and an “output” subcollection which contains the data stored in the destination table (i.e. the results of the scheduled query at that point in time).
5. Click into `${param:COLLECTION_PATH}/{{TRANSFER_CONFIG_ID}}/runs/latest`. You will see latestRunId, runMetadata, failedRowCount, totalRowCount fields. These are updated any time a transfer run completes, so you can add Firestore to this document to receive real-time updates.

## Client Integration

If you’d like to keep a subscribed listener for real-time updates and propagate the latest query results to the frontend, here’s a simple way to do that.

First you will need to identify the transfer config that was created. That can be done either by manually visiting Pantheon and identifying the relevant transfer config, or by running a query like this on Firestore:

```javascript
const q = db.collection(config.firestoreCollection).where("extInstanceId", "==", <MY_INSTANCE_ID>);
const results = await q.get();
const existingTransferConfig = results.docs[0].data();
const splitName = existingTransferConfig.name.split("/");
const transferConfigId = splitName[splitName.length-3];
```

This can either be done once and hardcoded in the client application, or dynamically queried at runtime on page-load.

The “latest” document for a Transfer Config will be updated every time a transfer config finishes and rows have been written to Firestore. Once the client application knows the transfer config ID, it can use a listener to subscribe to the “latest” document updates.

```javascript
const latestRunId = null;
db.collection(`transferConfigs/${transferConfigId}/runs`).doc("latest").onSnapshot(doc => { if (!!doc.data()) { latestRunId = doc.data().latestRunId } });
```

Whenever the “latest” document updates, these fields are changed: “failedRowCount”, “totalRowCount”, “runMetadata”, and “latestRunId”. The extension uses parallel individual writes to Firestore to maximize write throughout, and if some failures occur due to intermittent Firestore issues, they will be counted in failedRowCount. Depending on the application, you may want to refresh the query results only if there are no write failures.

Once you have the latestRunId, you can query the results of the query within Firestore:

```javascript
const q = db.collection(`transferConfigs/${transferConfigId}/runs/${latestRunId}/output`)
const results = await q.get();
```