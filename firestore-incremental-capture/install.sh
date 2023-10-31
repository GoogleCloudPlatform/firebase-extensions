#!/bin/bash

# Define variables at the top
PROJECT_ID=""
DATABASE_ID=""
DATABASE_LOCATION=""
LOCATION=""
EXT_INSTANCE_ID=""

# Enable PITR as per the Google Cloud Console guide

# Create secondary Firestore database
#gcloud alpha firestore databases create --database=$DATABASE_ID --location=$DATABASE_LOCATION --type=firestore-native --project=$PROJECT_ID

# Find extension's service account email
# Uncomment the line below if you need to dynamically fetch SA_EMAIL
SA_EMAIL=$(gcloud iam service-accounts list --format="value(EMAIL)" --filter="displayName='Firebase Extensions $EXT_INSTANCE_ID service account' AND DISABLED=False" --project="$PROJECT_ID")

# Configure Artifact Registry
gcloud artifacts repositories create $EXT_INSTANCE_ID --repository-format=docker --location=$LOCATION --project=$PROJECT_ID --async
gcloud auth configure-docker $LOCATION-docker.pkg.dev

# Add required policy binding for Artifact Registry
gcloud artifacts repositories add-iam-policy-binding $EXT_INSTANCE_ID --location=$LOCATION --project=$PROJECT_ID --member=serviceAccount:$SA_EMAIL --role=roles/artifactregistry.writer

# Add roles for extension service account to trigger Dataflow
gcloud projects add-iam-policy-binding $PROJECT_ID --project $PROJECT_ID --member=serviceAccount:$SA_EMAIL --role=roles/dataflow.developer
gcloud projects add-iam-policy-binding $PROJECT_ID --project $PROJECT_ID --member=serviceAccount:$SA_EMAIL --role=roles/iam.serviceAccountUser
gcloud projects add-iam-policy-binding $PROJECT_ID --project $PROJECT_ID --member=serviceAccount:$SA_EMAIL --role=roles/artifactregistry.writer

# Build Dataflow Flex Template (Download the JAR file first)
gcloud dataflow flex-template build gs://$PROJECT_ID.appspot.com/$EXT_INSTANCE_ID-dataflow-restore \
  --image-gcr-path $LOCATION-docker.pkg.dev/$PROJECT_ID/$EXT_INSTANCE_ID/dataflow/restore:latest \
  --sdk-language JAVA \
  --flex-template-base-image JAVA11 \
  --jar restore-firestore.jar \
  --env FLEX_TEMPLATE_JAVA_MAIN_CLASS="com.pipeline.RestorationPipeline" \
  --project $PROJECT_ID
