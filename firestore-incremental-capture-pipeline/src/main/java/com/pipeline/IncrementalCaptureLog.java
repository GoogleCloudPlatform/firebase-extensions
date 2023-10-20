package com.pipeline;

import java.util.Map;

import org.apache.avro.generic.GenericRecord;
import org.apache.beam.sdk.io.gcp.bigquery.BigQueryIO;
import org.apache.beam.sdk.io.gcp.bigquery.SchemaAndRecord;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.SerializableFunction;
import org.apache.beam.sdk.values.KV;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;

import com.google.firestore.v1.Document;
import com.google.firestore.v1.Value;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

public class IncrementalCaptureLog
    extends PTransform<PCollection<String>, PCollection<KV<String, Document>>> {

  final private String projectId;
  final private String firestoreDbId;
  final private Instant timestamp;

  public IncrementalCaptureLog(String projectId, Instant timestamp, String firestoreDbId) {
    this.projectId = projectId;
    this.timestamp = timestamp;
    this.firestoreDbId = firestoreDbId;
  }

  @Override
  public PCollection<KV<String, Document>> expand(PCollection<String> input) {

    String formattedTimestamp = Utils.adjustDate(timestamp);

    return input.getPipeline().apply("Read from BigQuery with Dynamic Query",
        BigQueryIO.read(new SerializableFunction<SchemaAndRecord, KV<String, Document>>() {
          public KV<String, Document> apply(SchemaAndRecord schemaAndRecord) {
            return convertToFirestoreValue(schemaAndRecord, projectId, firestoreDbId);
          }
        }).fromQuery(constructQuery(formattedTimestamp)).usingStandardSql().withTemplateCompatibility());
  }

  private String constructQuery(String timestamp) {
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
        "    WHERE timestamp < '" + timestamp + "' " +
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

    return query;

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

  private static String createDocumentName(String path, String projectId, String databaseId) {
    String documentPath = String.format(
        "projects/%s/databases/%s/documents",
        projectId,
        databaseId);

    return documentPath + "/" + path;
  }

}
