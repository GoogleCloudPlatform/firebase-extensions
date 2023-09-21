
package com.pipeline;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.google.protobuf.Timestamp;
import com.google.firestore.v1.ArrayValue;
import com.google.firestore.v1.MapValue;
import com.google.firestore.v1.Value;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.List;

public class FirestoreReconstructor {

    public enum FirestoreType {
        STRING,
        NUMBER,
        BOOLEAN,
        NULL,
        TIMESTAMP,
        GEOPOINT,
        REFERENCE,
    }

    public static Value getValueByType(String type, JsonElement value) {

        if (!value.isJsonPrimitive()) {
            return null;
        }

        Value.Builder builder = Value.newBuilder();

        switch (FirestoreType.valueOf(type.toUpperCase())) {
            case STRING:
                return builder.setStringValue(value.getAsString()).build();
            case NUMBER:
                return builder.setDoubleValue(value.getAsDouble()).build();
            case BOOLEAN:
                return builder.setBooleanValue(value.getAsBoolean()).build();
            case NULL:
                return builder.setNullValue(null).build();
            case TIMESTAMP:

                Timestamp.Builder timestampBuilder = Timestamp.newBuilder();

                Timestamp timestamp = timestampBuilder.setSeconds(value.getAsLong()).build();

                return builder.setTimestampValue(timestamp).build();
            // case GEOPOINT:
            // return value.getAsString();
            case REFERENCE:

                builder.setReferenceValue(value.getAsString());

                return builder.build();
            default:
                return null;
        }
    }

    public static Map<String, Value> buildFirestoreMap(JsonElement dataJson) {

        JsonObject dataObject = dataJson.getAsJsonObject();
        Map<String, Value> fieldsMap = new HashMap<>();

        for (Map.Entry<String, JsonElement> entry : dataObject.entrySet()) {
            JsonElement valueElem = entry.getValue();

            if (valueElem.isJsonObject() && valueElem.getAsJsonObject().has("type")
                    && valueElem.getAsJsonObject().has("value")) {
                JsonObject entryValueObject = valueElem.getAsJsonObject();
                String valueType = entryValueObject.get("type").getAsString().toUpperCase();

                Value val;
                switch (valueType) {
                    case "STRING":
                        val = Value.newBuilder().setStringValue(entryValueObject.get("value").getAsString()).build();
                        break;
                    case "NUMBER":
                        val = Value.newBuilder().setDoubleValue(entryValueObject.get("value").getAsDouble()).build();
                        break;
                    case "BOOLEAN":
                        val = Value.newBuilder().setBooleanValue(entryValueObject.get("value").getAsBoolean()).build();
                        break;
                    case "MAP":
                        val = Value.newBuilder().setMapValue(
                                MapValue.newBuilder().putAllFields(
                                        buildFirestoreMap(entryValueObject.get("value"))))
                                .build();
                        break;
                    case "ARRAY":
                        val = Value.newBuilder().setArrayValue(
                                ArrayValue.newBuilder().addAllValues(
                                        buildFirestoreList(entryValueObject.get("value").getAsJsonArray())))
                                .build();
                        break;
                    default:
                        val = null;
                        continue;
                }

                fieldsMap.put(entry.getKey(), val);
            }
        }

        // log it 
        System.out.println("fieldsMap: " + fieldsMap);
        return fieldsMap;
    }

    private static List<Value> buildFirestoreList(JsonArray arr) {

        List<Value> lst = new ArrayList<>();
        for (JsonElement el : arr) {
            Map<String, Value> mapData = buildFirestoreMap(el);
            Value val = Value.newBuilder().setMapValue(
                    MapValue.newBuilder().putAllFields(mapData)).build();

            lst.add(val);
        }

        return lst;
    }
}
