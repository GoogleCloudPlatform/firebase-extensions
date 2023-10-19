package com.pipeline;

import java.util.Objects;

import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.PCollection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.firestore.v1.DocumentRootName;
import com.google.firestore.v1.RunQueryRequest;
import com.google.firestore.v1.StructuredQuery;
import com.google.firestore.v1.WriteRequest;

public final class SelectCollectionQuery
    extends PTransform<PCollection<String>, PCollection<RunQueryRequest>> {
  private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

  private final String projectId;
  private final String databaseId;

  public SelectCollectionQuery(String projectId, String databaseId) {
    this.projectId = projectId;
    this.databaseId = databaseId;
  }

  @Override
  public PCollection<RunQueryRequest> expand(PCollection<String> input) {

    return input.apply(
        ParDo.of(
            new DoFn<String, RunQueryRequest>() {
              @ProcessElement
              public void processElement(ProcessContext c) {
                String collectionId = c.element();

                LOG.info("Collection ID: " + collectionId);

                // If the collectionId is "*", then we want to query all collections.
                if (collectionId.equals(collectionId)) {
                  LOG.info("Querying all collections");
                  RunQueryRequest runQueryRequest = RunQueryRequest.newBuilder()
                      .setParent(DocumentRootName.format(projectId, databaseId)).setStructuredQuery(
                          StructuredQuery.newBuilder()
                              .build())
                      .build();

                  c.output(runQueryRequest);
                  return;
                }

                StructuredQuery.CollectionSelector collection = StructuredQuery.CollectionSelector.newBuilder()
                    .setCollectionId(Objects.requireNonNull(c.element()))
                    .build();

                RunQueryRequest runQueryRequest = RunQueryRequest.newBuilder()
                    .setParent(DocumentRootName.format(projectId, databaseId))
                    .setStructuredQuery(
                        StructuredQuery.newBuilder()
                            .addFrom(collection)
                            .build())
                    .build();

                c.output(runQueryRequest);
              }
            }));
  }
}