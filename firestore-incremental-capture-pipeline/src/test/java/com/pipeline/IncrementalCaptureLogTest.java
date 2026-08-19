/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.pipeline;

import static org.junit.Assert.assertEquals;

import org.apache.avro.Schema;
import org.apache.avro.SchemaBuilder;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import org.apache.beam.sdk.io.gcp.bigquery.SchemaAndRecord;
import org.apache.beam.sdk.values.KV;
import org.junit.Test;

import com.google.firestore.v1.Document;

public class IncrementalCaptureLogTest {

  private static final String PROJECT_ID = "test-project";
  private static final String DATABASE_ID = "test-db";

  private static final Schema CHANGELOG_SCHEMA = SchemaBuilder.record("changelog")
      .fields()
      .requiredString("documentPath")
      .name("afterData").type().nullable().stringType().noDefault()
      .requiredString("changeType")
      .endRecord();

  private static SchemaAndRecord row(String documentPath, String afterData, String changeType) {
    GenericRecord record = new GenericData.Record(CHANGELOG_SCHEMA);
    record.put("documentPath", documentPath);
    record.put("afterData", afterData);
    record.put("changeType", changeType);

    return new SchemaAndRecord(record, null);
  }

  @Test
  public void qualifiesTheDocumentPathExactlyOnce() {
    KV<String, Document> kv =
        IncrementalCaptureLog.convertToFirestoreValue(row("users/abc", "{}", "UPDATE"), PROJECT_ID, DATABASE_ID);

    assertEquals(
        "projects/test-project/databases/test-db/documents/users/abc",
        kv.getValue().getName());
  }

  @Test
  public void treatsNullAfterDataAsAnEmptyDocument() {
    KV<String, Document> kv =
        IncrementalCaptureLog.convertToFirestoreValue(row("users/abc", null, "DELETE"), PROJECT_ID, DATABASE_ID);

    assertEquals(0, kv.getValue().getFieldsCount());
    assertEquals("DELETE", kv.getKey());
  }
}
