#!/usr/bin/env bash
set -euo pipefail

# Usage: watch-status.sh <collection/doc-id> [target-state] [timeout-seconds]
# Example: watch-status.sh generate/abc123 COMPLETED 30
#
# Polls a Firestore document until status.state matches the target value.

DOC_PATH="${1:?Usage: watch-status.sh <collection/doc-id> [target-state] [timeout-seconds]}"
TARGET_STATE="${2:-COMPLETED}"
TIMEOUT="${3:-60}"

PROJECT_ID="${PROJECT_ID:-demo-gcp}"
HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"
BASE_URL="http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents"

echo "Watching ${DOC_PATH} for status.state=${TARGET_STATE} (timeout: ${TIMEOUT}s)..."

elapsed=0
while [ $elapsed -lt "$TIMEOUT" ]; do
  RESPONSE=$(curl -sf "${BASE_URL}/${DOC_PATH}" 2>/dev/null || echo "{}")

  STATE=$(echo "$RESPONSE" | jq -r '.fields.status.mapValue.fields.state.stringValue // empty' 2>/dev/null)

  if [ "$STATE" = "$TARGET_STATE" ]; then
    echo "Status reached: ${TARGET_STATE} (after ${elapsed}s)"
    echo "$RESPONSE" | jq .
    exit 0
  fi

  if [ "$STATE" = "ERRORED" ] && [ "$TARGET_STATE" != "ERRORED" ]; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.fields.status.mapValue.fields.error.stringValue // "unknown error"' 2>/dev/null)
    echo "ERROR: Extension errored after ${elapsed}s: ${ERROR_MSG}"
    echo "$RESPONSE" | jq .
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
