package com.pipeline;

import org.apache.beam.sdk.io.gcp.firestore.FirestoreIO;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.values.PCollection;
import org.joda.time.Instant;

import com.google.firestore.v1.RunQueryRequest;
import com.google.firestore.v1.RunQueryResponse;

public class ReadFromFirestoreWithTimestamp
    extends PTransform<PCollection<RunQueryRequest>, PCollection<RunQueryResponse>> {

  final private Instant readTime;

  public ReadFromFirestoreWithTimestamp(Long timestamp) {
    this.readTime = org.joda.time.Instant.ofEpochSecond(timestamp / 1000);
  }

  @Override
  public PCollection<RunQueryResponse> expand(PCollection<RunQueryRequest> input) {
    return input.apply(
        "Batch read from Firestore with Timestamp",
        FirestoreIO.v1().read().runQuery().withReadTime(readTime).build());
  }
}
