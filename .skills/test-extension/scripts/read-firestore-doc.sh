#!/usr/bin/env bash
set -euo pipefail

# Usage: read-firestore-doc.sh <path>
# Examples:
#   read-firestore-doc.sh generate              # list all docs in collection
#   read-firestore-doc.sh generate/abc123       # read a specific document
#
# Requires: PROJECT_ID env var, gcloud auth

DOC_PATH="${1:?Usage: read-firestore-doc.sh <collection> or <collection/doc-id>}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"

ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token)
BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

# Determine if this is a collection (odd segments) or document (even segments)
SEGMENT_COUNT=$(echo "$DOC_PATH" | tr '/' '\n' | wc -l | tr -d ' ')

if [ $((SEGMENT_COUNT % 2)) -eq 1 ]; then
  echo "Listing documents in: ${DOC_PATH}"
else
  echo "Reading document: ${DOC_PATH}"
fi

RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/${DOC_PATH}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -ge 400 ] 2>/dev/null; then
  echo "ERROR: Firestore API returned HTTP ${HTTP_CODE}" >&2
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY" >&2
  exit 1
fi

echo "$BODY" | jq .
