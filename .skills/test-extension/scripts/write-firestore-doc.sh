#!/usr/bin/env bash
set -euo pipefail

# Usage: write-firestore-doc.sh <collection> '<json>'
# Example: write-firestore-doc.sh generate '{"prompt": "What is Firebase?"}'
#
# Writes a document to Firestore in the target project. JSON values are
# converted to Firestore field format automatically.
# Supports flat JSON with string, number, boolean, and null values.
# Nested objects and arrays are stringified — use the Firestore REST API
# directly if you need complex nested structures.
# Requires: PROJECT_ID env var, gcloud auth (application-default credentials)

COLLECTION="${1:?Usage: write-firestore-doc.sh <collection> '<json>'}"
JSON_DATA="${2:?Usage: write-firestore-doc.sh <collection> '<json>'}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"

ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token)
BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

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

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/${COLLECTION}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$FIELDS")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 400 ] 2>/dev/null; then
  echo "ERROR: Firestore API returned HTTP ${HTTP_CODE}" >&2
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY" >&2
  exit 1
fi

DOC_NAME=$(echo "$BODY" | jq -r '.name')
DOC_ID=$(echo "$DOC_NAME" | rev | cut -d'/' -f1 | rev)

echo "Document created: ${COLLECTION}/${DOC_ID}"
echo "$BODY" | jq .
