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
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

import org.junit.Test;

import com.google.firestore.v1.Value;
import com.google.gson.JsonElement;
import com.google.gson.JsonParser;
import com.google.protobuf.NullValue;

public class FirestoreReconstructorTest {

  private static final String PROJECT_ID = "test-project";
  private static final String DATABASE_ID = "test-db";

  private static Map<String, Value> build(String json) {
    JsonElement data = JsonParser.parseString(json);
    return FirestoreReconstructor.buildFirestoreMap(data, PROJECT_ID, DATABASE_ID);
  }

  @Test
  public void documentReferenceBecomesAFullyQualifiedReferenceValue() {
    Map<String, Value> fields = build(
        "{\"ref\":{\"type\":\"documentReference\",\"value\":\"users/abc\"}}");

    assertEquals(1, fields.size());
    assertEquals(
        "projects/test-project/databases/test-db/documents/users/abc",
        fields.get("ref").getReferenceValue());
  }

  @Test
  public void nullBecomesANullValue() {
    Map<String, Value> fields = build("{\"gone\":{\"type\":\"null\",\"value\":null}}");

    assertEquals(1, fields.size());
    assertEquals(NullValue.NULL_VALUE, fields.get("gone").getNullValue());
    assertEquals(Value.ValueTypeCase.NULL_VALUE, fields.get("gone").getValueTypeCase());
  }

  @Test
  public void binaryDecodesBase64IntoBytes() {
    byte[] payload = "hello bytes".getBytes(StandardCharsets.UTF_8);
    String base64 = Base64.getEncoder().encodeToString(payload);

    Map<String, Value> fields = build(
        "{\"blob\":{\"type\":\"binary\",\"value\":\"" + base64 + "\"}}");

    assertEquals(1, fields.size());
    assertEquals(
        com.google.protobuf.ByteString.copyFrom(payload),
        fields.get("blob").getBytesValue());
  }

  @Test
  public void unknownTypeTagIsSkippedWithoutThrowing() {
    Map<String, Value> fields = build(
        "{\"mystery\":{\"type\":\"vector\",\"value\":\"?\"},"
            + "\"name\":{\"type\":\"string\",\"value\":\"Ada\"}}");

    assertEquals(1, fields.size());
    assertTrue(fields.containsKey("name"));
    assertEquals("Ada", fields.get("name").getStringValue());
  }
}
