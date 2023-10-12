package com.pipeline;

import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.coders.VoidCoder;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreV1.BatchWriteWithSummary;
import org.apache.beam.sdk.io.gcp.firestore.RpcQosOptions;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.options.ValueProvider;
import org.apache.beam.sdk.transforms.Create;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.transforms.Wait;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;

import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Document;
import com.google.firestore.v1.RunQueryResponse;
import com.google.firestore.v1.Write;

public class RestorationPipeline {
  private static final FirestoreOptions DEFAULT_FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();

  public interface MyOptions extends PipelineOptions {
    ValueProvider<Long> getTimestamp();

    void setTimestamp(ValueProvider<Long> value);

    ValueProvider<String> getFirestoreDatabaseId();

    void setFirestoreDatabaseId(ValueProvider<String> value);

    ValueProvider<String> getFirestoreCollectionId();

    void setFirestoreCollectionId(ValueProvider<String> value);
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

    // Format timestamp to be used in the query
    Long timestamp = options.getTimestamp().get();
    String formattedTimestamp;

    try {
      formattedTimestamp = adjustDate(timestamp);
    } catch (Exception e) {
      throw new IllegalArgumentException("The provided date is in the future!");
    }

    String projectId = DEFAULT_FIRESTORE_OPTIONS.getProjectId();
    String collectionId = options.getFirestoreCollectionId().get();

    // Prepare basline data
    PCollection<BatchWriteWithSummary> baseline = pipeline
        .apply(Create.of(collectionId))
        .apply("Build the baseline query", new SelectCollectionQuery(projectId, options.getFirestoreDatabaseId().get()))
        .apply("Batch read from Firestore in the given time", new ReadFromFirestoreWithTimestamp(timestamp))
        .apply("Convert RunQueryResponse to Document", ParDo.of(new RunQueryResponseToDocument()))
        .apply("Write to the Firestore database instance", ParDo.of(new RunBatchWrite()));

    // Read from BigQuery
    PCollection<KV<String, Document>> applyIncrementalCapture = pipeline
        .apply(Create.empty(VoidCoder.of()))
        .apply("Read from BigQuery with Side Input", new IncrementalCaptureLog(projectId, formattedTimestamp));

    applyIncrementalCapture
        .apply(Wait.on(baseline))
        .apply("Prepare write operations", ParDo.of(new DocumentToWrite()))
        .apply("Write to the Firestore database instance", ParDo.of(new RunBatchWrite()));

    PipelineResult result = pipeline.run();

    // We try to identify if the pipeline is being run or a template is being
    // created
    if (options.as(DataflowPipelineOptions.class).getTemplateLocation() == null) {
      // If template location is null, then, pipeline is being run, so we can wait
      // until finish
      result.waitUntilFinish();
    }
  }

  public static String adjustDate(Long timestamp) {
    Instant instant = Instant.ofEpochMilli(timestamp);

    LocalDateTime t0 = LocalDateTime.from(instant);
    LocalDateTime now = LocalDateTime.now();

    Duration duration = Duration.between(t0, now);

    SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

    if (duration.isNegative()) {
      // t0 is in the future
      throw new IllegalArgumentException("The provided date is in the future!");
    }

    long daysDiff = duration.toDays();

    if (daysDiff > 7) {
      // Set t0 as the date representing 7 days before the "now" date
      return outputFormat.format(now.minus(7, ChronoUnit.DAYS));
    }

    return outputFormat.format(t0);
  }

  private static final class RunBatchWrite extends DoFn<Write, BatchWriteWithSummary> {
    RpcQosOptions rpcQosOptions = RpcQosOptions.newBuilder().build();

    @ProcessElement
    public void processElement(ProcessContext c) {
      c.output(FirestoreIO.v1().write().batchWrite().withRpcQosOptions(rpcQosOptions).build());
    }
  }

  private static final class RunQueryResponseToDocument extends DoFn<RunQueryResponse, Write> {
    @ProcessElement
    public void processElement(ProcessContext c) {
      c.output(Write.newBuilder().setUpdate(c.element().getDocument()).build());
    }
  }

}
