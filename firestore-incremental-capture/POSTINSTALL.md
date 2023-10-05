## Building the Dataflow Flex Template

Before this extension can run restoration jobs from BigQuery to Firestore, you must build the Dataflow Flex Template. This is a one-time process that you must perform before you can use the extension.

1. [Configure the Artificat Registery](https://cloud.google.com/dataflow/docs/guides/templates/using-flex-templates?hl=en#configure):
  ```bash
    gcloud artifacts repositories create ${param:EXT_INSTANCE_ID}-dataflow-restore \
    --repository-format=docker \
    --location=${param:LOCATION} \
    --async
  ```

  Configure Docker to authenticate requests for Artifact Registry:
  ``` bash
  gcloud auth configure-docker ${param:LOCATION}-docker.pkg.dev
  ```

2. Download the JAR file for the Dataflow Flex Template [here](functions/src/restore-1.0.jar).
3. Run the following command to build the Dataflow Flex Template:

  ```bash
    gcloud dataflow flex-template build gs://${param:PROJECT_ID}.appspot.com/${param:EXT_INSTANCE_ID}-dataflow-restore-template \
      --image-gcr-path ${param:LOCATION}-docker.pkg.dev/${param:PROJECT_ID}/${param:EXT_INSTANCE_ID}:latest \
      --sdk-language JAVA \
      --flex-template-base-image JAVA11 \
      --jar path/to/restore-1.0.jar \
      --env FLEX_TEMPLATE_JAVA_MAIN_CLASS="com.pipeline.RestorationPipeline"`,
  ```

### Required roles
- `roles/artifactregistry.writer`
- `roles/dataflow.developer`