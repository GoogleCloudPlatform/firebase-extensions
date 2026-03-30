#!/usr/bin/env bash
set -euo pipefail

# Usage: write-firestore-doc.sh <collection> '<json>'
# Example: write-firestore-doc.sh generate '{"prompt": "What is Firebase?"}'
#
# Writes a document to the Firestore emulator. The JSON values are converted
# to Firestore field format automatically. Supports string, number, and boolean values.

COLLECTION="${1:?Usage: write-firestore-doc.sh <collection> '<json>'}"
JSON_DATA="${2:?Usage: write-firestore-doc.sh <collection> '<json>'}"

PROJECT_ID="${PROJECT_ID:-demo-gcp}"
HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
BASE_URL="http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents"

# Convert simple JSON to Firestore field format using jq
FIELDS=$(echo "$JSON_DATA" | jq '{
  fields: (to_entries | map({
    key: .key,
    value: (
      if .value | type == "string" then { stringValue: .value }
      elif .value | type == "number" then
        if .value == (.value | floor) then { integerValue: (.value | tostring) }
        else { doubleValue: .value }
        end
      elif .value | type == "boolean" then { booleanValue: .value }
      elif .value == null then { nullValue: null }
      else { stringValue: (.value | tostring) }
      end
    )
  }) | from_entries)
}')

RESPONSE=$(curl -sf -X POST "${BASE_URL}/${COLLECTION}" \
  -H "Content-Type: application/json" \
  -d "$FIELDS")

DOC_NAME=$(echo "$RESPONSE" | jq -r '.name')
DOC_ID=$(echo "$DOC_NAME" | rev | cut -d'/' -f1 | rev)

echo "Document created: ${COLLECTION}/${DOC_ID}"
echo "$RESPONSE" | jq .
