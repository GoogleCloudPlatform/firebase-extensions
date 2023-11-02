This extension utilizes Cloud Functions to capture incremental changes and allows you to replay them against a restored Firestore instance.

Natively, Cloud Firestore supports minutely point-in-time recovery (PITR) up to 7 days.

This extension watches either a single collection or your whole database, and streams _all_ changes to a BigQuery dataset. It then provides an http endpoint for you to recover the state of your database at a specific timestamp. It does this by replaying changes on top of the closest PITR snapshot.

## Enable PITR in the Google Cloud Console

You _must_ have PITR enabled for your firestore database in order for this extension to work. Information on how to enable PITR can be found [here in the docs](https://firebase.google.com/docs/firestore/use-pitr).

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
