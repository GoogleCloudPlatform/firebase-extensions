package com.pipeline;

import com.google.api.services.bigquery.model.TableRow;
import com.google.cloud.firestore.Firestore;
// import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.Document;
import com.google.firestore.v1.Value;
import com.google.firestore.v1.Write;
import com.google.protobuf.NullValue;

import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Map;
import com.google.cloud.firestore.FirestoreOptions;

import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.io.gcp.bigquery.BigQueryIO;
import org.apache.beam.sdk.io.gcp.bigquery.SchemaAndRecord;
import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.io.gcp.firestore.RpcQosOptions;
import org.apache.beam.sdk.options.Default;
// import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.transforms.SerializableFunction;
import org.apache.beam.sdk.PipelineResult;
import org.apache.avro.generic.GenericRecord;
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;
import com.google.gson.JsonObject;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class RestorationPipeline {
  // private static final FirestoreOptions DEFAULT_FIRESTORE_OPTIONS = FirestoreOptions.getDefaultInstance();

  private static final FirestoreOptions FIRESTORE_OPTIONS =
        FirestoreOptions.newBuilder()
            .setProjectId("invertase--palm-demo")
            .setDatabaseId("da-backup")
            .build();

  public interface pipelineOptions extends org.apache.beam.sdk.io.gcp.firestore.FirestoreOptions {
    // @Description("The Cloud Firestore project ID")
    // @Default.String("")
    // String getProjectId();

    // void setProjectId(String projectId);

    // @Description("The Cloud Firestore database ID")
  }

  static class TransformToFirestoreDocument extends DoFn<Document, Write> {

    private static final Logger LOG = LoggerFactory.getLogger(TransformToFirestoreDocument.class);

    @ProcessElement
    public void processElement(ProcessContext context) {
      Document doc = context.element();
      LOG.info("Processing a row >>>>>> ");

      // Convert the TableRow to a Map<String, Value> for Firestore
      // Map<String, Value> firestoreMap = new HashMap<>();

      // for (Map.Entry<String, Object> entry : row.entrySet()) {
      //   Value value = Value.newBuilder().setStringValue(entry.getValue().toString()).build();
      //   firestoreMap.put(entry.getKey(), value);
      // }
      // Create a Firestore Write object from the map
      Write write = Write.newBuilder()
          .setUpdate(doc)
          .build();

      context.output(write);
    }
  }

  public static void main(String[] args) {
    pipelineOptions options = PipelineOptionsFactory.fromArgs(args).withValidation().as(pipelineOptions.class);
    options.setFirestoreDb("da-backup");
    Pipeline pipeline = Pipeline.create(options);
    RpcQosOptions rpcQosOptions = RpcQosOptions.newBuilder()
        .build();

    java.util.Date date = new java.util.Date();
    SimpleDateFormat outputFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    String outputDateString = outputFormat.format(date);

    String query = "WITH RankedChanges AS (" +
        "    SELECT " +
        "        documentId," +
        "        documentPath," +
        "        changeType," +
        "        beforeData," +
        "        afterData," +
        "        timestamp," +
        "        ROW_NUMBER() OVER(PARTITION BY documentId ORDER BY timestamp DESC) as rank" +
        "    FROM `" + "invertase--palm-demo" + ".syncData.syncData`" +
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
            BigQueryIO.read(new SerializableFunction<SchemaAndRecord, Document>() {
              public Document apply(SchemaAndRecord schemaAndRecord) {
                return convertToFirestoreValue(schemaAndRecord);
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

  private static String createDocumentName(String path) {
    String documentPath = String.format(
        "projects/%s/databases/%s/documents",
        "invertase--palm-demo",
        "da-backup");
    // FIRESTORE_OPTIONS.getDatabaseId());

    return documentPath + "/" + path;
  }

  private static Document convertToFirestoreValue(SchemaAndRecord schemaAndRecord) {

    GenericRecord record = schemaAndRecord.getRecord();

    String afterData = record.get("afterData").toString();

    String documentPath = createDocumentName(record.get("documentPath").toString());

    // this JsonElement has serialized data, e.g a string would be represented on the json tree as {type: "STRING", value: "some string"}
    JsonElement afterDataJson = JsonParser.parseString(afterData);


    Map<String, Value> firestoreMap = FirestoreReconstructor.buildFirestoreMap(afterDataJson);

    Document doc = Document.newBuilder().putAllFields((Map<String,Value>) firestoreMap).setName(documentPath).build();

    return doc;
  }
}