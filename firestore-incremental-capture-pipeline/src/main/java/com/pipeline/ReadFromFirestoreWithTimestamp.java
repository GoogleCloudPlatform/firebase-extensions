package com.pipeline;

import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
