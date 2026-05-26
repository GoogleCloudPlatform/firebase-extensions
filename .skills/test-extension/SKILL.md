---
name: test-extension
description: Test Firebase extensions end-to-end against a real Firebase project. Use when the user asks to test, verify, or debug an extension — covers building, installing, writing test data, triggering, and verifying output.
---

# Test Extension

Full-lifecycle manual testing of Firebase extensions against a production Firebase project.

**Important:** Always ask the user for their Firebase project ID before running any scripts. All scripts require `PROJECT_ID` to be set.

## Quick Start

```bash
# 0. Set the target project (ask the user for this)
export PROJECT_ID="<user-provided-project-id>"

# 1. Build the extension
cd <extension>/functions && npm install && npm run build

# 2. Install the extension (interactive — user must run this)
#    ! firebase ext:install ./<extension-dir> --project=$PROJECT_ID

# 3. Write test data to trigger the extension
.skills/test-extension/scripts/write-firestore-doc.sh <collection> '<json>'

# 4. Watch for completion
.skills/test-extension/scripts/watch-status.sh <collection> <doc-id>

# 5. Read the result
.skills/test-extension/scripts/read-firestore-doc.sh <collection>/<doc-id>

# 6. Clean up test data
.skills/test-extension/scripts/delete-firestore-doc.sh <collection>/<doc-id>
```

## Prerequisites

- The user must be authenticated: `firebase login` or `gcloud auth application-default login`
- The extension must already be installed on the target project, or install it first (see below)
- `PROJECT_ID` environment variable must be set

## Installing an Extension

`firebase ext:install` is interactive — there is no `--params` flag or non-interactive mode for providing configuration values. You cannot pipe or echo answers into it.

### Option 1: Manual config files + deploy (recommended for agents)

This is the non-interactive approach. You create the config files and deploy:

1. Create `firebase.json` at the repo root (if it doesn't exist):
   ```json
   {
     "extensions": {
       "<instance-id>": "./<extension-dir>"
     }
   }
   ```

2. Create `extensions/<instance-id>.env` with the param values. See extension-specific reference docs for the correct params (e.g. [references/multimodal-genai.md](references/multimodal-genai.md)).

3. For secret params (like `API_KEY`), create `extensions/<instance-id>.secret.local`:
   ```
   API_KEY=<ask the user for this>
   ```

4. Deploy: `firebase deploy --only extensions --project=$PROJECT_ID`

**Use Vertex AI as the provider when possible** — it uses the project's service account for auth, so no API key secret is needed.

### Option 2: Interactive install (user runs it)

Suggest the user runs the install command themselves:

```
! firebase ext:install ./<extension-dir> --project=$PROJECT_ID
```

The `!` prefix runs it in the current session so the user can interact with the prompts.

### Deployment Gotchas

- **Do NOT use `--force`** with `firebase deploy --only extensions`. It will **delete all extension instances** on the project that are not in `firebase.json`.
- **Instance ID conflicts**: If an instance with the same ID already exists, use a different instance ID (e.g. `firestore-multimodal-genai-test`). Use a unique collection name too to avoid conflicts with existing data.
- **Immutable params**: Some params like `LOCATION` are immutable after install. If you need to change them, uninstall and reinstall.
- **Never hardcode or commit API keys or secrets.** Always ask the user.

## Checking Logs

After triggering an extension, check Cloud Function logs to verify behavior:

```bash
gcloud functions logs read ext-<instance-id>-<function-name> \
  --project=$PROJECT_ID --limit=20 --region=<location>
```

The function name is typically `generateText` for Firestore-triggered GenAI extensions and `generateOnCall` for callable functions. The region must match the extension's `LOCATION` param.

## Uninstalling

```bash
firebase ext:uninstall <instance-id> --project=$PROJECT_ID --force
```

This removes the extension and cleans up `firebase.json` and the `.env` file. It does NOT delete Firestore data created by the extension.

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

1. Upload a file to the configured storage bucket via `gsutil` or the Firebase CLI
2. The extension triggers on `object.finalize`
3. Output is typically written to a Firestore collection or a different storage bucket
4. Check Firestore or the output bucket for results

## Available Scripts

All scripts require `PROJECT_ID` to be set. They use the Firebase/Google Cloud REST APIs with application default credentials:

| Script | Purpose |
|--------|---------|
| `write-firestore-doc.sh` | Write a JSON document to a collection |
| `read-firestore-doc.sh` | Read a document or list a collection |
| `delete-firestore-doc.sh` | Delete a specific document |
| `watch-status.sh` | Poll a document until status.state matches a target |
