#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
EMULATOR_DIR="$REPO_ROOT/_emulator"
PROJECT_ID="${PROJECT_ID:-demo-gcp}"
HEALTH_URL="http://127.0.0.1:4000"
MAX_WAIT="${MAX_WAIT:-60}"

echo "Resetting emulator ports..."
npx kill-port 8080 8085 4000 4400 5001 9199 9000 9099 2>/dev/null || true

echo "Starting Firebase emulator (project: $PROJECT_ID)..."
cd "$EMULATOR_DIR"
firebase emulators:start --project="$PROJECT_ID" &
EMULATOR_PID=$!

echo "Waiting for emulator to be ready (max ${MAX_WAIT}s)..."
elapsed=0
while [ $elapsed -lt "$MAX_WAIT" ]; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    echo "Emulator is ready (took ${elapsed}s)"
    echo "  Firestore: http://127.0.0.1:8080"
    echo "  Storage:   http://127.0.0.1:9199"
    echo "  Hub UI:    http://127.0.0.1:4000"
    echo "  PID:       $EMULATOR_PID"
    exit 0
  fi
  sleep 2
  elapsed=$((elapsed + 2))
done

echo "ERROR: Emulator failed to start within ${MAX_WAIT}s"
kill $EMULATOR_PID 2>/dev/null || true
exit 1
