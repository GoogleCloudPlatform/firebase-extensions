
package com.pipeline;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;
import java.util.List;
import com.google.gson.JsonArray;

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

    public static Object getValueByType(String type, JsonElement value) {
        switch (FirestoreType.valueOf(type.toUpperCase())) {
            case STRING:
                return value.getAsString();
            case NUMBER:
                return value.getAsDouble();
            case BOOLEAN:
                return value.getAsBoolean();
            case NULL:
                return null;
            case TIMESTAMP:
                return value.getAsString();
            case GEOPOINT:
                return value.getAsString();
            case REFERENCE:
                return value.getAsString();
            default:
                return null;
        }
    }

    public static Object processElement(JsonElement jsonElement, Object schemaObject) {
        // Check if it's an array
        if (jsonElement.isJsonArray()) {
            List<Object> resultList = new ArrayList<>();
            JsonArray jsonArray = jsonElement.getAsJsonArray();
            JsonArray schemaArray = (JsonArray) schemaObject;

            int index = 0;
            while (index < jsonArray.size()) {
                resultList.add(processElement(jsonArray.get(index), schemaArray.get(index)));
                index++;
            }
            return resultList;
        }

        // Check if it's an object
        if (jsonElement.isJsonObject() && schemaObject instanceof Map) {
            Map<String, Object> result = new HashMap<>();
            JsonObject jsonObject = jsonElement.getAsJsonObject();
            Map<String, Object> schemaMap = (Map<String, Object>) schemaObject;

            for (Entry<String, Object> entry : schemaMap.entrySet()) {
                String key = entry.getKey();
                Object schemaValue = entry.getValue();

                if (jsonObject.has(key)) {
                    result.put(key, processElement(jsonObject.get(key), schemaValue));
                }
            }
            return result;
        }

        // It's a simple value
        return getValueByType((String) schemaObject, jsonElement);
    }

}
