/**
 * Copyright 2023 Google LLC
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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.protobuf.Timestamp;
import com.google.firestore.v1.ArrayValue;
import com.google.firestore.v1.MapValue;
import com.google.firestore.v1.Value;

import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.time.Instant;
import java.time.format.DateTimeParseException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FirestoreReconstructor {

    private static final Logger LOG = LoggerFactory.getLogger(FirestoreReconstructor.class);

    // An element that cannot be reconstructed is replaced with null rather than
    // dropped, so the restored array keeps the length and the element positions
    // the document was written with.
    private static final Value UNRECONSTRUCTABLE_ELEMENT = Value.newBuilder()
            .setNullValue(com.google.protobuf.NullValue.NULL_VALUE).build();

    public enum FirestoreType {
        STRING,
        NUMBER,
        BOOLEAN,
        NULL,
        TIMESTAMP,
        GEOPOINT,
        REFERENCE,
    }

    // This method recursively builds a Firestore map from a JSON object
    // representing a Firestore document or map, according to our schema
    public static Map<String, Value> buildFirestoreMap(JsonElement dataJson, String projectId, String databaseId) {

        JsonObject dataObject = dataJson.getAsJsonObject();
        Map<String, Value> fieldsMap = new HashMap<>();

        for (Map.Entry<String, JsonElement> entry : dataObject.entrySet()) {
            JsonElement valueElem = entry.getValue();

            if (!isTaggedValue(valueElem)) {
                if (valueElem.isJsonObject()) {
                    LOG.warn("Skipping field '{}': not a serialized value", entry.getKey());
                }

                continue;
            }

            JsonObject entryValueObject = valueElem.getAsJsonObject();
            Value val = buildTaggedValue(entryValueObject, projectId, databaseId);

            if (val == null) {
                LOG.warn("Skipping field '{}': cannot reconstruct serialized type tag '{}'",
                        entry.getKey(), entryValueObject.get("type").getAsString());
                continue;
            }

            fieldsMap.put(entry.getKey(), val);
        }

        // log it
        return fieldsMap;
    }

    // A serialized value is a JSON object carrying a string "type" tag and a
    // "value". A map serialized as a bare field map can hold entries named
    // "type" and "value", but those entries are themselves objects, so
    // requiring a string tag keeps the two shapes apart.
    private static boolean isTaggedValue(JsonElement element) {
        if (!element.isJsonObject()) {
            return false;
        }

        JsonObject object = element.getAsJsonObject();
        JsonElement type = object.get("type");

        return type != null && type.isJsonPrimitive() && type.getAsJsonPrimitive().isString()
                && object.has("value");
    }

    // Builds the Value a serialized {type, value} object describes, or null
    // when the tag is unknown or its value does not have the shape the tag
    // implies. A changelog row corrupted when it was written is unrecoverable,
    // and it runs inside a BigQueryIO read with no handler, so one bad value
    // must cost its own field or element rather than the whole restore job.
    private static Value buildTaggedValue(JsonObject taggedValue, String projectId, String databaseId) {

        String valueType = taggedValue.get("type").getAsString().toUpperCase();
        JsonElement value = taggedValue.get("value");

        switch (valueType) {
            case "STRING":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                return Value.newBuilder().setStringValue(value.getAsString()).build();
            case "NUMBER":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                // A NaN or Infinity double reaches the changelog as a JSON null,
                // which JSON cannot represent and this pipeline cannot restore.
                try {
                    return Value.newBuilder().setDoubleValue(value.getAsDouble()).build();
                } catch (NumberFormatException e) {
                    return null;
                }
            case "BIGINT":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                try {
                    return Value.newBuilder().setIntegerValue(Long.parseLong(value.getAsString())).build();
                } catch (NumberFormatException e) {
                    return null;
                }
            case "BOOLEAN":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                return Value.newBuilder().setBooleanValue("true".equals(value.getAsString())).build();
            case "OBJECT":
            case "MAP":
                if (!value.isJsonObject()) {
                    return null;
                }

                return Value.newBuilder().setMapValue(
                        MapValue.newBuilder().putAllFields(
                                buildFirestoreMap(value, projectId, databaseId)))
                        .build();
            case "ARRAY":
                if (!value.isJsonArray()) {
                    return null;
                }

                return Value.newBuilder().setArrayValue(
                        ArrayValue.newBuilder().addAllValues(
                                buildFirestoreList(value.getAsJsonArray(), projectId, databaseId)))
                        .build();
            case "GEOPOINT":
                if (!value.isJsonObject()) {
                    return null;
                }

                JsonObject geopointValue = value.getAsJsonObject();
                Double latitudeValue = buildCoordinate(geopointValue, "latitude");
                Double longitudeValue = buildCoordinate(geopointValue, "longitude");

                if (latitudeValue == null || longitudeValue == null) {
                    return null;
                }

                return Value.newBuilder().setGeoPointValue(
                        com.google.type.LatLng.newBuilder().setLatitude(latitudeValue)
                                .setLongitude(longitudeValue)
                                .build())
                        .build();
            case "TIMESTAMP":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                try {
                    // parse the timestamp value as an Instant
                    Instant instant = Instant.parse(value.getAsString());

                    long epochSecond = instant.getEpochSecond();
                    int nanoSecond = instant.getNano();

                    Timestamp timestamp = Timestamp.newBuilder().setSeconds(epochSecond).setNanos(nanoSecond)
                            .build();

                    // convert to seconds and nanoseconds
                    return Value.newBuilder().setTimestampValue(timestamp).build();
                } catch (DateTimeParseException e) {
                    return null;
                }

            // The serializer emits "documentReference"; "reference" is kept for
            // changelog rows written by older serializer versions.
            case "REFERENCE":
            case "DOCUMENTREFERENCE":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                String fullReferenceString = String.format(
                        "projects/%s/databases/%s/documents/%s",
                        projectId,
                        databaseId,
                        value.getAsString());

                return Value.newBuilder().setReferenceValue(fullReferenceString).build();
            case "NULL":
                return Value.newBuilder().setNullValue(com.google.protobuf.NullValue.NULL_VALUE).build();
            case "BINARY":
                if (!value.isJsonPrimitive()) {
                    return null;
                }

                try {
                    byte[] bytes = Base64.getDecoder().decode(value.getAsString());

                    return Value.newBuilder().setBytesValue(com.google.protobuf.ByteString.copyFrom(bytes)).build();
                } catch (IllegalArgumentException e) {
                    return null;
                }
            default:
                return null;
        }
    }

    private static Double buildCoordinate(JsonObject geopointValue, String name) {

        JsonElement coordinate = geopointValue.get(name);

        if (coordinate == null || !coordinate.isJsonObject()) {
            return null;
        }

        JsonElement value = coordinate.getAsJsonObject().get("value");

        if (value == null || !value.isJsonPrimitive() || !value.getAsJsonPrimitive().isNumber()) {
            return null;
        }

        return value.getAsDouble();
    }

    private static List<Value> buildFirestoreList(JsonArray arr, String projectId, String databaseId) {

        List<Value> lst = new ArrayList<>();
        for (JsonElement el : arr) {
            if (isTaggedValue(el)) {
                JsonObject taggedValue = el.getAsJsonObject();
                Value val = buildTaggedValue(taggedValue, projectId, databaseId);

                if (val == null) {
                    LOG.warn("Nulling array element: cannot reconstruct serialized type tag '{}'",
                            taggedValue.get("type").getAsString());
                    lst.add(UNRECONSTRUCTABLE_ELEMENT);
                    continue;
                }

                lst.add(val);
                continue;
            }

            if (!el.isJsonObject()) {
                LOG.warn("Nulling array element: expected a serialized value or a field map");
                lst.add(UNRECONSTRUCTABLE_ELEMENT);
                continue;
            }

            // Map elements are serialized as bare field maps, without a "map" tag.
            Map<String, Value> mapData = buildFirestoreMap(el, projectId, databaseId);

            lst.add(Value.newBuilder().setMapValue(
                    MapValue.newBuilder().putAllFields(mapData)).build());
        }

        return lst;
    }
}
