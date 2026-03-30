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
  curl -sf "${BASE_URL}/${DOC_PATH}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq .
else
  echo "Reading document: ${DOC_PATH}"
  curl -sf "${BASE_URL}/${DOC_PATH}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" | jq .
fi
