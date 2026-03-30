#!/usr/bin/env bash
set -euo pipefail

# Usage: delete-firestore-doc.sh <collection/doc-id>
# Example: delete-firestore-doc.sh generate/abc123
#
# Deletes a specific document from Firestore.
# Requires: PROJECT_ID env var, gcloud auth

DOC_PATH="${1:?Usage: delete-firestore-doc.sh <collection/doc-id>}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"

ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token)
BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"

echo "Deleting document: ${DOC_PATH}"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "${BASE_URL}/${DOC_PATH}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

if [ "$HTTP_CODE" -ge 400 ] 2>/dev/null; then
  echo "ERROR: Firestore API returned HTTP ${HTTP_CODE}" >&2
  exit 1
fi

echo "Document deleted."
