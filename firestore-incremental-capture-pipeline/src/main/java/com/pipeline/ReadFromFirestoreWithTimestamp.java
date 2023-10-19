package com.pipeline;

import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.DoFn.Setup;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firestore.v1.RunQueryRequest;
import com.google.firestore.v1.RunQueryResponse;

public class ReadFromFirestoreWithTimestamp
    extends PTransform<PCollection<RunQueryRequest>, PCollection<RunQueryResponse>> {
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  final private Instant readTime;

  public ReadFromFirestoreWithTimestamp(Instant readTime) {
    this.readTime = readTime;
  }

  @Override
  public PCollection<RunQueryResponse> expand(PCollection<RunQueryRequest> input) {
    try {
      Utils.adjustDate(readTime);
    } catch (Exception e) {
      LOG.error(e.getMessage());
      throw new IllegalArgumentException(e);
    }

    LOG.info("Read time: " + readTime.toDateTime().toString());

    return input.apply(
        "Batch read from Firestore with Timestamp",
        FirestoreIO.v1().read().runQuery().withReadTime(readTime).build());
  }
}

/*
 * // package com.pipeline;
 * 
 * import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
 * import
 * org.apache.beam.sdk.io.gcp.firestore.FirestoreV1.BatchWriteWithSummary;
 * import org.apache.beam.sdk.transforms.DoFn;
 * 
 * import com.google.cloud.firestore.Firestore;
 * import com.google.cloud.firestore.FirestoreOptions;
 * import com.google.firestore.v1.Document;
 * 
 * public class WriteToFirestoreDoFn extends DoFn<Document,
 * BatchWriteWithSummary> {
 * private final String projectId;
 * private final String databaseId;
 * private final Long timestamp;
 * private transient Firestore firestore;
 * 
 * private static final Logger LOG = LoggerFactory.getLogger(Utils.class);
 * 
 * public WriteToFirestoreDoFn(String projectId, String databaseId, Long
 * timestamp) {
 * this.projectId = projectId;
 * this.databaseId = databaseId;
 * this.timestamp = timestamp;
 * 
 * }
 * 
 * @Setup
 * public void setup() {
 * // Initialize the Firestore client with the specified projectId
 * firestore = FirestoreOptions.newBuilder()
 * .setProjectId(projectId)
 * .setDatabaseId(databaseId)
 * .build()
 * .getService();
 * }
 * 
 * @ProcessElement
 * public void processElement(ProcessContext c) {
 * 
 * // Write the document data to Firestore
 * c.output(FirestoreIO.v1().write().batchWrite().build());
 * }
 * 
 * @Teardown
 * public void teardown() {
 * if (firestore != null) {
 * try {
 * firestore.close();
 * } catch (Exception e) {
 * e.printStackTrace();
 * }
 * }
 * }
 * }
 */