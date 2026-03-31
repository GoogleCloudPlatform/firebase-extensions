#!/usr/bin/env bash
set -euo pipefail

# Usage: watch-status.sh <collection/doc-id> [target-state] [timeout-seconds]
# Example: watch-status.sh generate/abc123 COMPLETED 30
#
# Polls a Firestore document until status.state matches the target value.
# Requires: PROJECT_ID env var, gcloud auth

DOC_PATH="${1:?Usage: watch-status.sh <collection/doc-id> [target-state] [timeout-seconds]}"
TARGET_STATE="${2:-COMPLETED}"
TIMEOUT="${3:-60}"
PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID environment variable}"

BASE_URL="https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents"
ACCESS_TOKEN=$(gcloud auth application-default print-access-token 2>/dev/null || gcloud auth print-access-token)

echo "Watching ${DOC_PATH} for status.state=${TARGET_STATE} (timeout: ${TIMEOUT}s)..."

elapsed=0
while [ $elapsed -lt "$TIMEOUT" ]; do
  RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/${DOC_PATH}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")

  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')

  if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "ERROR: Authentication failed (HTTP ${HTTP_CODE}). Check gcloud auth." >&2
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY" >&2
    exit 1
  fi

  if [ "$HTTP_CODE" = "404" ]; then
    echo "  [${elapsed}s] Document not found yet"
    sleep 2
    elapsed=$((elapsed + 2))
    continue
  fi

  STATE=$(echo "$BODY" | jq -r '.fields.status.mapValue.fields.state.stringValue // empty' 2>/dev/null)

  if [ "$STATE" = "$TARGET_STATE" ]; then
    echo "Status reached: ${TARGET_STATE} (after ${elapsed}s)"
    echo "$BODY" | jq .
    exit 0
  fi

  if [ "$STATE" = "ERRORED" ] && [ "$TARGET_STATE" != "ERRORED" ]; then
    ERROR_MSG=$(echo "$BODY" | jq -r '.fields.status.mapValue.fields.error.stringValue // "unknown error"' 2>/dev/null)
    echo "ERROR: Extension errored after ${elapsed}s: ${ERROR_MSG}"
    echo "$BODY" | jq .
    exit 1
  fi

  if [ -n "$STATE" ]; then
    echo "  [${elapsed}s] Current state: ${STATE}"
  else
    echo "  [${elapsed}s] No status field yet"
  fi

  sleep 2
  elapsed=$((elapsed + 2))
done

echo "TIMEOUT: status.state did not reach ${TARGET_STATE} within ${TIMEOUT}s"
exit 1
