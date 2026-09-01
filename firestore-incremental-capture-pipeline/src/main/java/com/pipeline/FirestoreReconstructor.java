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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FirestoreReconstructor {

    private static final Logger LOG = LoggerFactory.getLogger(FirestoreReconstructor.class);

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
    // implies. Changelog rows corrupted when they were written are
    // unrecoverable, so the caller skips them rather than failing the job.
    private static Value buildTaggedValue(JsonObject taggedValue, String projectId, String databaseId) {

        String valueType = taggedValue.get("type").getAsString().toUpperCase();
        JsonElement value = taggedValue.get("value");

        switch (valueType) {
            case "STRING":
                return Value.newBuilder().setStringValue(value.getAsString()).build();
            case "NUMBER":
                return Value.newBuilder().setDoubleValue(value.getAsDouble()).build();
            case "BOOLEAN":
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
                JsonObject latitude = geopointValue.get("latitude").getAsJsonObject();
                JsonObject longitude = geopointValue.get("longitude").getAsJsonObject();

                Double latitudeValue = latitude.get("value").getAsDouble();
                Double longitudeValue = longitude.get("value").getAsDouble();

                return Value.newBuilder().setGeoPointValue(
                        com.google.type.LatLng.newBuilder().setLatitude(latitudeValue)
                                .setLongitude(longitudeValue)
                                .build())
                        .build();
            case "TIMESTAMP":

                // parse the timestamp value as an Instant
                Instant instant = Instant.parse(value.getAsString());

                long epochSecond = instant.getEpochSecond();
                int nanoSecond = instant.getNano();

                Timestamp timestamp = Timestamp.newBuilder().setSeconds(epochSecond).setNanos(nanoSecond)
                        .build();

                // convert to seconds and nanoseconds
                return Value.newBuilder().setTimestampValue(timestamp).build();

            // The serializer emits "documentReference"; "reference" is kept for
            // changelog rows written by older serializer versions.
            case "REFERENCE":
            case "DOCUMENTREFERENCE":

                String fullReferenceString = String.format(
                        "projects/%s/databases/%s/documents/%s",
                        projectId,
                        databaseId,
                        value.getAsString());

                return Value.newBuilder().setReferenceValue(fullReferenceString).build();
            case "NULL":
                return Value.newBuilder().setNullValue(com.google.protobuf.NullValue.NULL_VALUE).build();
            case "BINARY":
                byte[] bytes = Base64.getDecoder().decode(value.getAsString());

                return Value.newBuilder().setBytesValue(com.google.protobuf.ByteString.copyFrom(bytes)).build();
            default:
                return null;
        }
    }

    private static List<Value> buildFirestoreList(JsonArray arr, String projectId, String databaseId) {

        List<Value> lst = new ArrayList<>();
        for (JsonElement el : arr) {
            if (isTaggedValue(el)) {
                JsonObject taggedValue = el.getAsJsonObject();
                Value val = buildTaggedValue(taggedValue, projectId, databaseId);

                if (val == null) {
                    LOG.warn("Skipping array element: cannot reconstruct serialized type tag '{}'",
                            taggedValue.get("type").getAsString());
                    continue;
                }

                lst.add(val);
                continue;
            }

            if (!el.isJsonObject()) {
                LOG.warn("Skipping array element: expected a serialized value or a field map");
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
