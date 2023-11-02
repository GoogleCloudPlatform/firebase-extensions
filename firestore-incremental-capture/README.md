# Firestore Incremental Capture

**Author**: undefined 

**Description**: Provides fine-grained Point-in-time-recovery allowing restoration to a database of your choice.



**Details**: This extension utilizes Cloud Functions to capture incremental changes and allows you to replay them against a restored Firestore instance.

Natively, Cloud Firestore supports minutely point-in-time recovery (PITR) up to 7 days.

This extension watches either a single collection or your whole database, and streams _all_ changes to a BigQuery dataset. It then provides an http endpoint for you to recover the state of your database at a specific timestamp. It does this by replaying changes on top of the closest PITR snapshot.

## Enable PITR in the Google Cloud Console

_Note:_ You must have PITR enabled for your firestore database in order for this extension to work. Information on how to enable PITR can be found [here in the docs](https://firebase.google.com/docs/firestore/use-pitr).

### Setup

A valid database must exist for the restoration to backup to. Ensure that a separate Firestore existance exists.

If one does not exist, you can create one with the following script:

```bash
    gcloud alpha firestore databases create \
    --database=DATABASE_ID \
    --location=LOCATION \
    --type=DATABASE_TYPE \
    --project=PROJECT_ID

```




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
