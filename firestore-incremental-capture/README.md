# Firestore Incremental Capture

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Provides fine-grained Point-in-time-recovery allowing restoration to a database of your choice.



**Details**: This extension utilizes Cloud Functions to capture incremental changes and allows you to replay them against a restored Firestore instance.

The purpose of this extension is to allow you safeguard your database on a granular scale, to recover the state of your Firestore database in case of accidental or malicious changes or deletions.

Natively, Cloud Firestore supports minutely point-in-time recovery (PITR) up to 7 days. This extension watches either a single collection or your whole database, and streams _all_ changes to a BigQuery dataset. It does this via a streaming Dataflow pipeline. The Dataflow pipeline must be built for the extension to work. Step-by-step instructions for this process are included in the postinstall documentation, which you can view in the firebase console once the extension is installed.

The extension then provides an http endpoint for you to recover the state of your database at a specific timestamp. It does this by replaying changes on top of the closest PITR snapshot.

## Setup

### Enable PITR in the Google Cloud Console

You _must_ have PITR enabled for your firestore database in order for this extension to work. Information on how to enable PITR can be found [here in the docs](https://firebase.google.com/docs/firestore/use-pitr).

### Set up a backup instance

A valid database must exist for the restoration to backup to. Ensure that a separate Firestore existance exists.

If one does not exist, you can create one with the following script:

```bash
    gcloud alpha firestore databases create \
    --database=DATABASE_ID \
    --location=LOCATION \
    --type=firestore-native \
    --project=PROJECT_ID
```

Note that this extension currently only works on database instances in `firestore-native` mode.

### Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:

- Dataflow
- BigQuery
- Artifact Registry
- Cloud EventArc
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))
- Cloud Run (powers v2 functions)

[Learn more about Firebase billing](https://firebase.google.com/pricing).

### Additional Uninstall Steps

> ⚠️ The extension does not delete various resources automatically on uninstall.

After you have uninstalled this extension, you will probably want to remove the dataflow pipeline which was set up. You can do this through the
Google Cloud Console [here](https://console.cloud.google.com/dataflow/pipelines). This extension will also create artifacts stored in the Artifact Registry, which you can also manage from the console [here](https://console.cloud.google.com/artifacts).




**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Collection path: What is the path to the collection that contains the strings that you want to translate?


* Bigquery dataset Id: The id of the Bigquery dataset to sync data to.


* Bigquery table Id: The id of the Bigquery table to sync data to. example: sync


* Bucket name: In which storage bucket do you want to keep converted text?


* Backup instance Id: The name of the Firestore instance to backup the database to.




**Cloud Functions:**

* **runInitialSetup:** Creates a Firestore backup for the configured instance.

* **onFirestoreBackupInit:** Runs an initial backup of the database

* **syncData:** Listens for writes of new strings to your specified Cloud Firestore collection, translates the strings, then writes the translated strings back to the same document.

* **syncDataTask:** Distributed cloud task for syncing data to BigQuery

* **onCloudBuildComplete:** Listens for completed cloud build tasks used in the deployment.

* **onHttpRunRestoration:** Starts a new restoration task

* **buildFlexTemplate:** Builds a flex template for the dataflow job.

* **onBackupRestore:** Exports data from storage to a pre-defined Firestore instance.



**APIs Used**:

* eventarc.googleapis.com (Reason: Powers all events and triggers)

* run.googleapis.com (Reason: Powers v2 Cloud Functions)

* bigquery.googleapis.com (Reason: Running queries)

* dataflow.googleapis.com (Reason: Running dataflow jobs)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows the extension to write updates to the database.)

* datastore.importExportAdmin (Reason: Allows the extension to backup the Firestore database.)

* bigquery.admin (Reason: Allows the creation of BQ jobs to import Firestore backups.)

* storage.admin (Reason: Allows management of exported Firestore backups.)

* pubsub.admin (Reason: Allows DTS to grant DTS service account permission to send notifications to Pub/Sub topic.)
