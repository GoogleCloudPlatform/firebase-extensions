#!/usr/bin/env bash
set -euo pipefail

# Usage: read-firestore-doc.sh <path>
# Examples:
#   read-firestore-doc.sh generate              # list all docs in collection
#   read-firestore-doc.sh generate/abc123       # read a specific document

DOC_PATH="${1:?Usage: read-firestore-doc.sh <collection> or <collection/doc-id>}"

PROJECT_ID="${PROJECT_ID:-demo-gcp}"
HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
BASE_URL="http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents"

# Determine if this is a collection (odd segments) or document (even segments)
SEGMENT_COUNT=$(echo "$DOC_PATH" | tr '/' '\n' | wc -l | tr -d ' ')

if [ $((SEGMENT_COUNT % 2)) -eq 1 ]; then
  # Odd segments = collection path, list documents
  echo "Listing documents in: ${DOC_PATH}"
  curl -sf "${BASE_URL}/${DOC_PATH}" | jq .
else
  # Even segments = document path, get single document
  echo "Reading document: ${DOC_PATH}"
  curl -sf "${BASE_URL}/${DOC_PATH}" | jq .
fi
