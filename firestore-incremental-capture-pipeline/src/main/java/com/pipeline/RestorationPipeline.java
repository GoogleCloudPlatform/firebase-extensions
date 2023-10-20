package com.pipeline;

import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Document;
import com.google.firestore.v1.Write;

public class RestorationPipeline {
  private static final FirestoreOptions DEFAULT_FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  public interface MyOptions extends DataflowPipelineOptions,
      org.apache.beam.sdk.io.gcp.firestore.FirestoreOptions {
    Long getTimestamp();

    void setTimestamp(Long value);

    String getFirestoreCollectionId();

    void setFirestoreCollectionId(String value);
  }

  public static void main(String[] args) {
    MyOptions options = PipelineOptionsFactory.fromArgs(args).as(MyOptions.class);

    Pipeline pipeline = Pipeline.create(options);

    String project = options.getProject();
    String collectionId = options.getFirestoreCollectionId();
    String secondaryDatabase = options.getFirestoreDb();
    String defaultDatabase = DEFAULT_FIRESTORE_OPTIONS.getDatabaseId();
    Instant readTime = Instant.ofEpochSecond(options.getTimestamp());

    options.setFirestoreDb(secondaryDatabase);

    LOG.info(defaultDatabase);

    // Read from Firestore at the specified timestamp to form the baseline
    PCollection<Document> documentsAtReadTime = pipeline
        .apply(Create.of(collectionId))
        .apply("Prepare the PITR query", new FirestoreHelpers.RunQuery(project, defaultDatabase))
        .apply(
            FirestoreIO.v1()
                .read()
                .runQuery()
                .withReadTime(readTime)
                .build())
        .apply(new FirestoreHelpers.RunQueryResponseToDocument());

    // Write the documents to the secondary database
    documentsAtReadTime
        .apply("Create the write request",
            ParDo.of(new DoFn<Document, Write>() {
              @ProcessElement
              public void processElement(ProcessContext c) {
                Document document = c.element();

                // Replace the default database with the secondary database in the document id
                String id = document.getName().replace(defaultDatabase, secondaryDatabase);

                Document newDocument = Document.newBuilder()
                    .setName(id)
                    .putAllFields(document.getFieldsMap())
                    .build();

                c.output(Write.newBuilder()
                    .setUpdate(newDocument)
                    .build());
              }
            }))
        .apply("Write to the Firestore database instance", new FirestoreHelpers.BatchWrite());

    // BigQuery read and subsequent Firestore write
    pipeline
        .apply(Create.of(""))
        .apply("Read from BigQuery",
            new IncrementalCaptureLog(project, readTime, secondaryDatabase))
        .apply("Prepare write operations",
            new FirestoreHelpers.DocumentToWrite(defaultDatabase, defaultDatabase))
        .apply("Write to the Firestore database instance (From BigQuery)",
            new FirestoreHelpers.BatchWrite());

    PipelineResult result = pipeline.run();

    // We try to identify if the pipeline is being run or a template is being
    // created
    if (options.as(DataflowPipelineOptions.class).getTemplateLocation() == null) {
      // If template location is null, then, pipeline is being run, so we can wait
      // until finish
      result.waitUntilFinish();
    }
  }

}
