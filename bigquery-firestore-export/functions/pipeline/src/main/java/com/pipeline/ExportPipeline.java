package com.pipeline;

import com.google.api.services.bigquery.model.TableRow;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Document;
import com.google.firestore.v1.Value;
import com.google.firestore.v1.Write;

import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.io.gcp.bigquery.BigQueryIO;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.io.gcp.firestore.RpcQosOptions;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.options.ValueProvider;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;

public class ExportPipeline {
  private static final FirestoreOptions FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();

  public interface MyOptions extends PipelineOptions {
    ValueProvider<String> getQuery();

    void setQuery(ValueProvider<String> value);
  }

  static class TransformToFirestoreDocument extends DoFn<TableRow, Write> {
    // private static final Logger LOG =
    // LoggerFactory.getLogger(TransformToFirestoreDocument.class);

    @ProcessElement
    public void processElement(ProcessContext context) {
      TableRow row = context.element();

      // Convert the TableRow to a Map<String, Value> for Firestore
      Map<String, Value> firestoreMap = new HashMap<>();

      for (Map.Entry<String, Object> entry : row.entrySet()) {
        Value value = Value.newBuilder().setStringValue(entry.getValue().toString()).build();
        firestoreMap.put(entry.getKey(), value);
      }

      String path = createDocumentName("exportBQ/" + UUID.randomUUID().toString());

      // Create a Firestore Write object from the map
      Write write = Write.newBuilder()
          .setUpdate(Document.newBuilder().putAllFields(firestoreMap).setName(path).build())
          .build();

      context.output(write);
    }
  }

  public static void main(String[] args) {
    MyOptions options = PipelineOptionsFactory.fromArgs(args).as(MyOptions.class);
    Pipeline pipeline = Pipeline.create(options);
    RpcQosOptions rpcQosOptions = RpcQosOptions.newBuilder()
        .build();

    java.util.Date date = new java.util.Date();
    SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    String outputDateString = outputFormat.format(date);

    String query = "SELECT * FROM `invertase--palm-demo.stress_test.hundred`";

    pipeline
        .apply("ReadFromBigQuery",
            BigQueryIO.readTableRows().withoutValidation().fromQuery(options.getQuery()).usingStandardSql().withTemplateCompatibility())
        .apply("TransformToFirestoreDocument", ParDo.of(new TransformToFirestoreDocument()))
        .apply("WriteToFirestore", FirestoreIO.v1().write().batchWrite().withRpcQosOptions(rpcQosOptions).build());

    PipelineResult result = pipeline.run(); // Capture the result instead of running waitUntilFinish here

    // We try to identify if the pipeline is being run or a template is being
    // created
    if (options.as(DataflowPipelineOptions.class).getTemplateLocation() == null) {
      // If template location is null, then, pipeline is being run, so we can wait
      // until finish
      result.waitUntilFinish();
    }
  }

  private static String createDocumentName(String path) {
    String documentPath = String.format(
        "projects/%s/databases/%s/documents",
        FIRESTORE_OPTIONS.getProjectId(),
        FIRESTORE_OPTIONS.getDatabaseId());

    return documentPath + "/" + path;
  }
}