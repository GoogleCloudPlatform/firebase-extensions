package com.pipeline;

import java.text.SimpleDateFormat;
import java.util.Map;

import org.apache.avro.generic.GenericRecord;
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.PipelineResult;
import org.apache.beam.sdk.io.gcp.bigquery.BigQueryIO;
import org.apache.beam.sdk.io.gcp.bigquery.SchemaAndRecord;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.io.gcp.firestore.RpcQosOptions;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.transforms.SerializableFunction;
import org.apache.beam.sdk.values.KV;

import org.slf4j.LoggerFactory;
import org.slf4j.Logger;

import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Value;
import com.google.firestore.v1.Write;
import com.google.firestore.v1.Document;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

public class RestorationPipeline {
  private static final FirestoreOptions DEFAULT_FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();

  public interface MyOptions extends PipelineOptions {
    // ValueProvider<String> getFirestoreCollection();

    // void setFirestoreCollection(ValueProvider<String> value);

    // ValueProvider<String> getFirestoreDatabaseId();

    // void setFirestoreDatabaseId(ValueProvider<String> value);
  }

  static class TransformToFirestoreDocument extends DoFn<KV<String, Document>, Write> {

    private static final Logger LOG = LoggerFactory.getLogger(TransformToFirestoreDocument.class);

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

    RpcQosOptions rpcQosOptions = RpcQosOptions.newBuilder()
        .build();

    java.util.Date date = new java.util.Date();
    SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    String outputDateString = outputFormat.format(date);

    String projectId = DEFAULT_FIRESTORE_OPTIONS.getProjectId();

    String query = "WITH RankedChanges AS (" +
        "    SELECT " +
        "        documentId," +
        "        documentPath," +
        "        changeType," +
        "        beforeData," +
        "        afterData," +
        "        timestamp," +
        "        ROW_NUMBER() OVER(PARTITION BY documentId ORDER BY timestamp DESC) as rank" +
        "    FROM `" + projectId + ".syncData.syncData`" +
        "    WHERE timestamp < '" + outputDateString + "' " +
        ") " +
        "SELECT " +
        "    documentId," +
        "    documentPath," +
        "    changeType," +
        "    beforeData," +
        "    afterData," +
        "    timestamp " +
        "FROM RankedChanges " +
        "WHERE rank = 1 " +
        "ORDER BY documentId, timestamp DESC";

    pipeline
        .apply("ReadFromBigQuery",
            BigQueryIO.read(new SerializableFunction<SchemaAndRecord, KV<String, Document>>() {
              public KV<String, Document> apply(SchemaAndRecord schemaAndRecord) {
                return convertToFirestoreValue(schemaAndRecord, projectId, DEFAULT_FIRESTORE_OPTIONS.getDatabaseId());
              }
            }).withoutValidation().fromQuery(query).usingStandardSql()
                .withTemplateCompatibility())
        .apply("TransformToFirestoreDocument", ParDo.of(new TransformToFirestoreDocument()))
        .apply("WriteToFirestore", FirestoreIO.v1().write().batchWrite().withRpcQosOptions(rpcQosOptions).build());

    PipelineResult result = pipeline.run();

    // We try to identify if the pipeline is being run or a template is being
    // created
    if (options.as(DataflowPipelineOptions.class).getTemplateLocation() == null) {
      // If template location is null, then, pipeline is being run, so we can wait
      // until finish
      result.waitUntilFinish();
    }
  }

  private static String createDocumentName(String path, String projectId, String databaseId) {
    String documentPath = String.format(
        "projects/%s/databases/%s/documents",
        projectId,
        databaseId);

    return documentPath + "/" + path;
  }

  private static KV<String, Document> convertToFirestoreValue(SchemaAndRecord schemaAndRecord, String projectId,
      String databaseId) {

    GenericRecord record = schemaAndRecord.getRecord();

    String data = record.get("beforeData").toString();
    String documentPath = createDocumentName(record.get("documentPath").toString(), projectId, databaseId);
    String changeType = record.get("changeType").toString();

    // this JsonElement has serialized data, e.g a string would be represented on
    // the json tree as {type: "STRING", value: "some string"}
    JsonElement dataJson = JsonParser.parseString(data);

    Map<String, Value> firestoreMap = FirestoreReconstructor.buildFirestoreMap(dataJson, projectId, databaseId);

    // using static methods as beam seems to error when passing an instance version
    // of FirestoreReconstructor to the transform
    Document doc = Document.newBuilder().putAllFields((Map<String, Value>) firestoreMap).setName(documentPath).build();

    KV<String, Document> kv = KV.of(changeType, doc);

    return kv;
  }
}
