#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-demo-gcp}"
HOST="${FIRESTORE_EMULATOR_HOST:-127.0.0.1:8080}"

echo "Clearing all Firestore data (project: $PROJECT_ID)..."
curl -sf -X DELETE "http://${HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents" > /dev/null
echo "Firestore data cleared."
