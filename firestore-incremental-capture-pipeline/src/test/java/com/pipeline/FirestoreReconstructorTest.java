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
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
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

  private static List<Value> buildArrayElements(String elementsJson) {
    Map<String, Value> fields = build(
        "{\"items\":{\"type\":\"array\",\"value\":[" + elementsJson + "]}}");

    return fields.get("items").getArrayValue().getValuesList();
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

  @Test
  public void stringArrayElementsBecomeStringValues() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"string\",\"value\":\"a\"},{\"type\":\"string\",\"value\":\"b\"}");

    assertEquals(2, elements.size());
    assertEquals("a", elements.get(0).getStringValue());
    assertEquals("b", elements.get(1).getStringValue());
  }

  @Test
  public void numberArrayElementsBecomeDoubleValues() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"number\",\"value\":1},{\"type\":\"number\",\"value\":2.5}");

    assertEquals(2, elements.size());
    assertEquals(1.0, elements.get(0).getDoubleValue(), 0.0);
    assertEquals(2.5, elements.get(1).getDoubleValue(), 0.0);
  }

  @Test
  public void booleanArrayElementsBecomeBooleanValues() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"boolean\",\"value\":true},{\"type\":\"boolean\",\"value\":false}");

    assertEquals(2, elements.size());
    assertTrue(elements.get(0).getBooleanValue());
    assertFalse(elements.get(1).getBooleanValue());
  }

  @Test
  public void nullArrayElementBecomesANullValue() {
    List<Value> elements = buildArrayElements("{\"type\":\"null\",\"value\":null}");

    assertEquals(1, elements.size());
    assertEquals(NullValue.NULL_VALUE, elements.get(0).getNullValue());
    assertEquals(Value.ValueTypeCase.NULL_VALUE, elements.get(0).getValueTypeCase());
  }

  @Test
  public void referenceArrayElementBecomesAFullyQualifiedReferenceValue() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"reference\",\"value\":\"users/abc\"},"
            + "{\"type\":\"documentReference\",\"value\":\"users/def\"}");

    assertEquals(2, elements.size());
    assertEquals(
        "projects/test-project/databases/test-db/documents/users/abc",
        elements.get(0).getReferenceValue());
    assertEquals(
        "projects/test-project/databases/test-db/documents/users/def",
        elements.get(1).getReferenceValue());
  }

  @Test
  public void binaryArrayElementDecodesBase64IntoBytes() {
    byte[] payload = "hello bytes".getBytes(StandardCharsets.UTF_8);
    String base64 = Base64.getEncoder().encodeToString(payload);

    List<Value> elements = buildArrayElements(
        "{\"type\":\"binary\",\"value\":\"" + base64 + "\"}");

    assertEquals(1, elements.size());
    assertEquals(
        com.google.protobuf.ByteString.copyFrom(payload),
        elements.get(0).getBytesValue());
  }

  @Test
  public void timestampArrayElementBecomesATimestampValue() {
    Instant instant = Instant.parse("2026-01-02T03:04:05.000Z");

    List<Value> elements = buildArrayElements(
        "{\"type\":\"timestamp\",\"value\":\"2026-01-02T03:04:05.000Z\"}");

    assertEquals(1, elements.size());
    assertEquals(instant.getEpochSecond(), elements.get(0).getTimestampValue().getSeconds());
    assertEquals(instant.getNano(), elements.get(0).getTimestampValue().getNanos());
  }

  @Test
  public void geopointArrayElementBecomesAGeoPointValue() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"geopoint\",\"value\":{"
            + "\"latitude\":{\"type\":\"number\",\"value\":52.379189},"
            + "\"longitude\":{\"type\":\"number\",\"value\":4.899431}}}");

    assertEquals(1, elements.size());
    assertEquals(52.379189, elements.get(0).getGeoPointValue().getLatitude(), 0.0);
    assertEquals(4.899431, elements.get(0).getGeoPointValue().getLongitude(), 0.0);
  }

  @Test
  public void nestedArrayElementsAreReconstructed() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"array\",\"value\":[{\"type\":\"string\",\"value\":\"deep\"}]}");

    assertEquals(1, elements.size());

    List<Value> nested = elements.get(0).getArrayValue().getValuesList();

    assertEquals(1, nested.size());
    assertEquals("deep", nested.get(0).getStringValue());
  }

  @Test
  public void mapArrayElementsAreReconstructedFromBareFieldMaps() {
    List<Value> elements = buildArrayElements(
        "{\"name\":{\"type\":\"string\",\"value\":\"Ada\"},"
            + "\"age\":{\"type\":\"number\",\"value\":36}}");

    assertEquals(1, elements.size());

    Map<String, Value> fields = elements.get(0).getMapValue().getFieldsMap();

    assertEquals(2, fields.size());
    assertEquals("Ada", fields.get("name").getStringValue());
    assertEquals(36.0, fields.get("age").getDoubleValue(), 0.0);
  }

  @Test
  public void taggedAndMapElementsCoexistInOneArray() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"string\",\"value\":\"a\"},"
            + "{\"name\":{\"type\":\"string\",\"value\":\"Ada\"}},"
            + "{\"type\":\"null\",\"value\":null}");

    assertEquals(3, elements.size());
    assertEquals("a", elements.get(0).getStringValue());
    assertEquals("Ada", elements.get(1).getMapValue().getFieldsMap().get("name").getStringValue());
    assertEquals(Value.ValueTypeCase.NULL_VALUE, elements.get(2).getValueTypeCase());
  }

  @Test
  public void mapElementWithTypeAndValueFieldsIsNotReadAsATaggedValue() {
    List<Value> elements = buildArrayElements(
        "{\"type\":{\"type\":\"string\",\"value\":\"invoice\"},"
            + "\"value\":{\"type\":\"number\",\"value\":10}}");

    assertEquals(1, elements.size());

    Map<String, Value> fields = elements.get(0).getMapValue().getFieldsMap();

    assertEquals("invoice", fields.get("type").getStringValue());
    assertEquals(10.0, fields.get("value").getDoubleValue(), 0.0);
  }

  @Test
  public void unknownTaggedArrayElementIsSkippedWithoutThrowing() {
    List<Value> elements = buildArrayElements(
        "{\"type\":\"vector\",\"value\":\"?\"},{\"type\":\"string\",\"value\":\"a\"}");

    assertEquals(1, elements.size());
    assertEquals("a", elements.get(0).getStringValue());
  }

  @Test
  public void legacyNullArrayElementIsSkippedWithoutThrowing() {
    // The original extension tagged a null array element with `typeof null`,
    // which no reader can tell from a map. Those rows are unrecoverable.
    List<Value> elements = buildArrayElements(
        "{\"type\":\"object\",\"value\":null},{\"type\":\"string\",\"value\":\"a\"}");

    assertEquals(1, elements.size());
    assertEquals("a", elements.get(0).getStringValue());
  }
}
