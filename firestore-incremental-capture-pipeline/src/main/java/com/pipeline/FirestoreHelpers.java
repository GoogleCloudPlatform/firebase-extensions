package com.pipeline;

import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.transforms.PTransform;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.PCollection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.firestore.v1.RunQueryRequest;
import com.google.firestore.v1.StructuredQuery;
import com.google.firestore.v1.WriteRequest;
import com.google.firestore.v1.StructuredQuery.CollectionSelector;

public class FirestoreHelpers {
  public static final class RunQuery extends BasePTransform<String, RunQueryRequest> {
    private static final Logger LOG = LoggerFactory.getLogger(Utils.class);

    final String projectId;

    public RunQuery(String projectId, String database) {
      super(database, "projects/" + projectId + "/databases/" + database + "/documents");
      this.projectId = projectId;
    }

    @Override
    public PCollection<RunQueryRequest> expand(PCollection<String> input) {
      LOG.info(baseDocumentPath);
      return input.apply(
          ParDo.of(
              new DoFn<String, RunQueryRequest>() {
                @ProcessElement
                public void processElement(ProcessContext c) {
                  final String collectionId = c.element();

                  CollectionSelector collection = CollectionSelector
                      .newBuilder()
                      .setCollectionId(collectionId)
                      .build();

                  RunQueryRequest runQueryRequest = RunQueryRequest.newBuilder()
                      .setParent(baseDocumentPath)
                      .setStructuredQuery(
                          com.google.firestore.v1.StructuredQuery.newBuilder()
                              .addFrom(collection)
                              .build())
                      .build();

                  c.output(runQueryRequest);
                }
              }));
    }
  }

  private abstract static class BasePTransform<InT, OutT>
      extends PTransform<PCollection<InT>, PCollection<OutT>> {

    protected final String database;
    protected final String baseDocumentPath;

    private BasePTransform(String database, String baseDocumentPath) {
      this.database = database;
      this.baseDocumentPath = baseDocumentPath;
    }

    // protected String docPath(String docId) {
    // return FirestoreHelpers.docPath(baseDocumentPath, docId);
    // }
  }

  private static String docPath(String baseDocumentPath, String collectionId, String docId) {
    return String.format("%s/%s/%s", baseDocumentPath, collectionId, docId);
  }
}
