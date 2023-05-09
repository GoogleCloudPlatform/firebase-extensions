# Export BigQuery to Firestore

**Author**: Google Cloud (**[https://cloud.google.com](https://cloud.google.com)**)

**Description**: Schedules BigQuery queries and exports the results to Firestore.



**Details**: ## How This Extension Works

This extension helps developers to set up their frontend clients to subscribe to BQ queries that periodically refresh on a scheduled basis. A canonical use case is election results, where you might have a frontend that needs to refresh live to show the latest results. This extension would be useful in any scenario where an app developer needs to push analytical data back to users.

To use the extension, developers will configure a specific Firestore document for each query and have their frontends listen for updates, and the BigQuery table/query to execute. In the background, BigQuery will run the query on a schedule, and the extension will write the result back to the specified document. Schedules are managed as Transfer Configs using the [Data Transfer Service](https://cloud.google.com/bigquery/docs/scheduling-queries).

Upon installation, a Transfer Config is created for you via the Data Transfer Service API. This Transfer Config will be updated if you update the extension parameters for the instance. You can also choose to use an existing Transfer Config, in which case the extension won’t manage the creation/updates for you.

If you would like to specify multiple queries at different intervals, you can create multiple instances of the extension.

The extension will provide a Pub/Sub trigger that listens to new messages written to the specified topic, representing transfer run completion events.

The extension will parse the message to identify the correct destination table based on the runtime. It will then run a “SELECT *” query from the destination table and write the results (as JSON) to Firestore. 

Each run will write to a document with ID “latest”:

```
**COLLECTION:** transferConfigs/<configId>/runs/latest

**DOCUMENT:** {
  runMetadata: { },
  totalRowCount: 779,
  failedRowCount: 0,
  latestRunId: 648762e0-0000-28ef-9109-001a11446b2a,
} 
```

Each run will also write to a “runs” subcollection with runID as the document ID, to preserve history:

```
**COLLECTION:** transferConfigs/<configId>/runs/<runId>

**DOCUMENT:** {
  runMetadata: { },
  totalRowCount: 779,
  failedRowCount: 0,
  expireAt: …
}
```

Query results will be stored as individual documents in a subcollection under the run document (i.e. transferConfigs/<configId>/runs/<runId>/output). Frontend applications can subscribe to the “latest” document to listen for changes to latestRunId, and run an additional Firestore query to get the BQ query results as individual documents.

**Additional Setup**

Make sure that you've set up a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) in your Firebase project. 

You will also need a BigQuery instance with a dataset that contains at least one table.

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan.

You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:

* Cloud Pub/Sub
* Cloud Firestore
* BigQuery
* Cloud Functions (Node.js 14+ runtime. See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))




**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* BigQuery Dataset Location: What is the location of the BigQuery dataset referenced in the query?

* Transfer Config Name: If you have a pre-existing transfer config you'd like to use, please enter the name here. If provided, all params except FIRESTORE_COLLECTION, LOCATION, and BIGQUERY_DATASET_LOCATION are ignored.

* Display Name: What display name would you like to use? Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

* Dataset ID: What's the BigQuery destination dataset you'd like to use? Each transfer run will write to a table in this destination dataset. Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

* Table Name: What's the destination table name prefix you'd like to use? Each transfer run will write to the table with this name, postfixed with the runtime. Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

* Query String: What's the BQ query you'd like to execute?

* Partitioning Field: What's the partitioning field on the destination table ID? Leave empty if not using a partitioning field. Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

* Schedule: What's the execution schedule you'd like to use for this query? Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

* Pub Sub Topic: What's the Pub Sub topic to write messages to when the scheduled query finishes executing? Only enter a value if not using a pre-existing transfer config, otherwise this parameter will be ignored.

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
