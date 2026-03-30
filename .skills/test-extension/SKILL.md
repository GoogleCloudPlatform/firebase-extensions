---
name: test-extension
description: Test Firebase extensions end-to-end using the local emulator. Use when the user asks to test, verify, or debug an extension — covers building, emulator setup, writing test data, triggering, and verifying output.
---

# Test Extension

Full-lifecycle manual testing of Firebase extensions against the local emulator.

## Quick Start

```bash
# 1. Build the extension
cd <extension>/functions && npm install && npm run build

# 2. Start the emulator (from repo root)
.skills/test-extension/scripts/start-emulator.sh

# 3. Write test data to trigger the extension
.skills/test-extension/scripts/write-firestore-doc.sh <collection> '<json>'

# 4. Watch for completion
.skills/test-extension/scripts/watch-status.sh <collection> <doc-id>

# 5. Read the result
.skills/test-extension/scripts/read-firestore-doc.sh <collection>/<doc-id>

# 6. Clean up
.skills/test-extension/scripts/clear-firestore.sh
.skills/test-extension/scripts/stop-emulator.sh
```

## Extension Type Routing

Before testing, determine the extension's trigger type:

- **Firestore-triggered** (most GenAI extensions): Write a document to the configured collection. See [references/firestore-extensions.md](references/firestore-extensions.md) for per-extension details.
- **Storage-triggered** (image/video/audio extensions): Upload a file to the configured bucket. See [references/storage-extensions.md](references/storage-extensions.md).
- **Other** (Pub/Sub, HTTPS): See the extension's own test files for patterns.

## Firestore Extension Testing Flow

1. Write a document with the required input fields (e.g. `prompt` for chatbot)
2. The extension triggers on the write and sets `status.state` to `PROCESSING`
3. On completion, `status.state` becomes `COMPLETED` and the response field is populated
4. If it fails, `status.state` becomes `ERRORED` with `status.error` containing the message

**Gotchas:**
- The document must NOT already have the response field populated, or the extension skips it
- The document must NOT already have `status.state` set to `PROCESSING`, `COMPLETED`, or `ERRORED`
- To re-trigger, either create a new document or clear the response field and status

## Storage Extension Testing Flow

1. Upload a file to the configured storage bucket via the emulator REST API or `gsutil`
2. The extension triggers on `object.finalize`
3. Output is typically written to a Firestore collection or a different storage bucket
4. Check Firestore or the output bucket for results

## Emulator Details

See [references/emulator.md](references/emulator.md) for port mapping, health checks, environment variables, and Firebase CLI commands.

## Available Scripts

All scripts are in `scripts/` and use `curl` + `jq` against the emulator REST API:

| Script | Purpose |
|--------|---------|
| `start-emulator.sh` | Start emulator with health check polling |
| `stop-emulator.sh` | Stop emulator cleanly |
| `clear-firestore.sh` | Delete all Firestore emulator data |
| `write-firestore-doc.sh` | Write a JSON document to a collection |
| `read-firestore-doc.sh` | Read a document or list a collection |
| `watch-status.sh` | Poll a document until status.state matches a target |
