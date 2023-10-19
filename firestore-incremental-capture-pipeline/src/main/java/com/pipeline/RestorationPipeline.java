package com.pipeline;

import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Document;
import com.google.firestore.v1.RunQueryResponse;
import com.google.firestore.v1.Write;

public class RestorationPipeline {
  private static final FirestoreOptions DEFAULT_FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  public interface MyOptions extends DataflowPipelineOptions, org.apache.beam.sdk.io.gcp.firestore.FirestoreOptions {
    Long getTimestamp();

    void setTimestamp(Long value);

    String getFirestoreCollectionId();

    void setFirestoreCollectionId(String value);
  }

  static class DocumentToWrite extends DoFn<KV<String, Document>, Write> {

    @ProcessElement
    public void processElement(ProcessContext context) {

      String changeType = context.element().getKey();
      Document document = context.element().getValue();

      switch (changeType) {
        case "CREATE":
          context.output(Write.newBuilder()
              .setDelete(document.getName())
              .build());

          break;

        default:
          context.output(Write.newBuilder()
              .setUpdate(document)
              .build());
      }

    }
  }

  public static void main(String[] args) {
    MyOptions options = PipelineOptionsFactory.fromArgs(args).as(MyOptions.class);

    Pipeline pipeline = Pipeline.create(options);

    String project = options.getProject();
    String collectionId = options.getFirestoreCollectionId();
    String databaseId = options.getFirestoreDb();
    Instant readTime = Instant.ofEpochSecond(options.getTimestamp());

    options.setFirestoreDb(databaseId);

    LOG.info(readTime.toDateTime().toString());

    PCollection<Document> documentsAtReadTime = pipeline
        .apply(Create.of(collectionId))
        .apply("", new FirestoreHelpers.RunQuery(project, "(default)"))
        .apply(
            FirestoreIO.v1()
                .read()
                .runQuery()
                .withReadTime(readTime)
                .build())
        .apply(ParDo.of(new RunQueryResponseToDocument()));

    LOG.info(options.getFirestoreDb());

    // Baseline Firestore operations
    documentsAtReadTime
        .apply("Create the write request",
            ParDo.of(new DoFn<Document, Write>() {
              @ProcessElement
              public void processElement(ProcessContext c) {
                Document document = c.element();
                String id = document.getName().replace("(default)", databaseId);

                Document newDocument = Document.newBuilder()
                    .setName(id)
                    .putAllFields(document.getFieldsMap())
                    .build();

                LOG.info(newDocument.getName());

                c.output(Write.newBuilder()
                    .setUpdate(newDocument)
                    .build());
              }
            }))
        .apply("Write to the Firestore database instance", FirestoreIO.v1().write().batchWrite().build());

    PipelineResult result = pipeline.run();

    PCollection<String> inputForBigQuery = pipeline
        .apply(Create.of(""));

    // BigQuery read and subsequent Firestore write
    inputForBigQuery
        .apply("Read from BigQuery", new IncrementalCaptureLog(project, readTime, databaseId))
        .apply("Prepare write operations", ParDo.of(new DocumentToWrite()))
        .apply("Write to the Firestore database instance (From BigQuery)",
            FirestoreIO.v1().write().batchWrite().build());

    // We try to identify if the pipeline is being run or a template is being
    // created
    if (options.as(DataflowPipelineOptions.class).getTemplateLocation() == null) {
      // If template location is null, then, pipeline is being run, so we can wait
      // until finish
      result.waitUntilFinish();
    }
  }

  private static final class RunQueryResponseToDocument extends DoFn<RunQueryResponse, Document> {

    @ProcessElement
    public void processElement(ProcessContext c) {
      c.output(c.element().getDocument());
    }
  }

}
