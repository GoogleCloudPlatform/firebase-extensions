#!/usr/bin/env bash
set -euo pipefail

echo "Stopping Firebase emulator..."
npx kill-port 8080 8085 4000 4400 5001 9199 9000 9099 2>/dev/null || true
echo "Emulator stopped."
