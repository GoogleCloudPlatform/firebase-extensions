# Export BigQuery to Firestore

**Author**: Google Cloud (**[https://cloud.google.com](https://cloud.google.com)**)

**Description**: Schedules BigQuery queries and exports the results to Firestore.



**Details**: This extension helps you set up automated, scheduled jobs that run BigQuery queries and subsequently export the query results to Firestore. A common use case for this extension is to present application-driven analytics, like product engagement metrics or election results, from Firestore, using batch data originally stored and aggregated by BigQuery.

To use the extension, configure a BigQuery query to execute along with a schedule to execute the query. Schedules are managed under the hood by BigQuery Transfer Configs using the [Data Transfer Service](https://cloud.google.com/bigquery/docs/scheduling-queries). Once a scheduled BigQuery query completes, the extension will export the results back to a configurable Firestore collection. 

To facilitate the export, the extension also creates a Pub/Sub trigger to capture notification events for BigQuery scheduled query (transfer run) completions. These events are utilized to automatically trigger a Cloud Function that conducts a BigQuery to Firestore data export job. 

Each scheduled BigQuery query run will write to a unique Firestore “runs” document, using a unique “runID”: 

- A summary of each run is stored in the “runId” document.
- Actual rows from BigQuery query results will be stored as individual Firestore documents in an “output” subcollection under the “runId” document (i.e. transferConfigs/<configId>/runs/<runId>/output):

```
COLLECTION: transferConfigs/<configId>/runs/<runId>
DOCUMENT: {
  runMetadata: { },
  totalRowCount: 779,
  failedRowCount: 0
}
```

To determine what the latest run is for a scheduled BigQuery query, read the metadata from the “latest” document in Firestore. Frontend applications using Firestore real-time listeners can subscribe to the “latest” document to listen for changes, in order to query and render the latest scheduled run results.

```
COLLECTION: transferConfigs/<configId>/runs/latest
DOCUMENT: {
  runMetadata: { },
  totalRowCount: 779,
  failedRowCount: 0,
  latestRunId: 648762e0-0000-28ef-9109-001a11446b2a
}
```

If you would like to specify multiple BigQuery queries at different intervals, you can create multiple instances of the extension.

**Additional Setup**

To install the extension, your project must be on the Blaze (pay as you go) plan.

Make sure that you've set up a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) in your Firebase project.

You will also need a BigQuery instance with a dataset that contains at least one table.



**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* BigQuery Dataset Location: What is the location of the BigQuery dataset referenced in the query?

* Display Name: What display name would you like to use?

* Dataset ID: What's the BigQuery destination dataset you'd like to use? Each transfer run will write to a table in this destination dataset.

* Destination Table Name: What's the destination table name prefix you'd like to use? Each transfer run will write to the table with this name, postfixed with the runtime.

* Query String: What's the BQ query you'd like to execute?

* Partitioning Field: What's the partitioning field on the destination table ID? Leave empty if not using a partitioning field.

* Schedule: What's the execution schedule you'd like to use for this query?

* Pub Sub Topic: What's the Pub Sub topic to write messages to when the scheduled query finishes executing?

* Firestore Collection: What's the top-level Firestore Collection to store transfer configs, run metadata, and query output?



**Cloud Functions:**

* **processMessages:** undefined

* **upsertTransferConfig:** Creates transfer config if doesn't exist yet.



**APIs Used**:

* bigquery.googleapis.com (Reason: Running queries)

* bigquerydatatransfer.googleapis.com (Reason: Scheduling data transfers)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows this extension to access Cloud Firestore to write query results from BQ.)

* bigquery.admin (Reason: Allows this extension to create transfer configs in BQ, and query BQ destination tables.)

* pubsub.admin (Reason: Allows DTS to grant DTS service account permission to send notifications to Pub/Sub topic)
