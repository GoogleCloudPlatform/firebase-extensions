### Setup

A valid database must exist for the restoration to backup to. Ensure a seperate Firestore existance exists.

If one does not exist, you can create one with the following:

```bash
    gcloud alpha firestore databases create \
    --database=DATABASE_ID \
    --location=LOCATION \
    --type=DATABASE_TYPE \
    --project=PROJECT_ID

```


## Enable PITR in the Google Cloud Console

Foolow the guidelines here [here](https://firebase.google.com/docs/firestore/use-pitr#gcloud) to enable PITR on your current database.