# firestore-multimodal-genai Testing Reference

## Overview

Performs generative AI tasks on text (and optionally images) using Gemini models, triggered by Firestore document writes.

## Installation Config

Example `extensions/firestore-multimodal-genai-test.env`:

```
GENERATIVE_AI_PROVIDER=vertex-ai
MODEL=gemini-2.5-flash
COLLECTION_NAME=generate-test
PROMPT={{ prompt }}
RESPONSE_FIELD=output
LOCATION=us-central1
VERTEX_AI_PROVIDER_LOCATION=null
ENABLE_GENKIT_MONITORING=no
HARM_CATEGORY_HATE_SPEECH=HARM_BLOCK_THRESHOLD_UNSPECIFIED
HARM_CATEGORY_DANGEROUS_CONTENT=HARM_BLOCK_THRESHOLD_UNSPECIFIED
HARM_CATEGORY_HARASSMENT=HARM_BLOCK_THRESHOLD_UNSPECIFIED
HARM_CATEGORY_SEXUALLY_EXPLICIT=HARM_BLOCK_THRESHOLD_UNSPECIFIED
CANDIDATE_COUNT=1
CANDIDATES_FIELD=candidates
```

Use `vertex-ai` as the provider to avoid needing an API key — it uses the project service account. If using `google-ai`, you also need an `extensions/<instance-id>.secret.local` file with `API_KEY=<key>`.

## Trigger Mechanics

- **Trigger**: Firestore `document.write` on `COLLECTION_NAME/{docId}`
- **Input**: Document fields matching handlebars variables in `PROMPT`. If PROMPT is `{{ prompt }}`, the document needs a `prompt` string field.
- **Output**: Written to `RESPONSE_FIELD` (default: `output`)
- **Status tracking**: `status.state` transitions: `PROCESSING` → `COMPLETED` or `ERRORED`

## Test Workflow

```bash
export PROJECT_ID="<project>"

# Write a test doc
.skills/test-extension/scripts/write-firestore-doc.sh generate-test '{"prompt": "What is Firebase in one sentence?"}'

# Watch for completion (doc ID from output above)
.skills/test-extension/scripts/watch-status.sh generate-test/<doc-id> COMPLETED 60

# Read result
.skills/test-extension/scripts/read-firestore-doc.sh generate-test/<doc-id>

# Check logs
gcloud functions logs read ext-<instance-id>-generateText \
  --project=$PROJECT_ID --limit=20 --region=us-central1

# Clean up
.skills/test-extension/scripts/delete-firestore-doc.sh generate-test/<doc-id>
```

## Cloud Functions

The extension deploys two functions:
- `generateText` — Firestore-triggered, processes document writes
- `generateOnCall` — HTTPS callable function for direct API calls

## Genkit Monitoring

The extension supports optional Genkit Monitoring via the `ENABLE_GENKIT_MONITORING` param.

### Behavior when enabled

- `enableFirebaseTelemetry()` is called during Genkit client initialization
- The call itself **does not throw** if IAM roles are missing — it succeeds at init time
- Permission errors occur **asynchronously** when telemetry data is flushed to Cloud Monitoring/Trace/Logging
- These async errors are **non-blocking** — the extension continues to function normally

### Required IAM roles (manual grant)

These roles are NOT declared in `extension.yaml` (to avoid backend errors from too many roles). Users must grant them manually:

```bash
SA="ext-<instance-id>@<project>.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/monitoring.metricWriter" --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/cloudtrace.agent" --condition=None
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA}" --role="roles/logging.logWriter" --condition=None
```

Note: `--condition=None` is required if the project's IAM policy has conditional bindings, otherwise gcloud errors in non-interactive mode.

### What to look for in logs

| Scenario | Log message |
|----------|------------|
| Monitoring enabled, roles granted | `Genkit Monitoring enabled` (INFO) |
| Monitoring enabled, roles NOT granted | `Genkit Monitoring enabled` (INFO), then async `PERMISSION_DENIED` errors when telemetry flushes |
| Monitoring disabled | No monitoring-related log messages |

### Service account name

The extension service account follows the pattern `ext-<instance-id>@<project>.iam.gserviceaccount.com`, but the instance ID may be truncated. Check the actual name in the Cloud Function logs — permission error messages include the full service account name.

## Gotchas

- **Vertex AI location**: `VERTEX_AI_PROVIDER_LOCATION` defaults to `null` which means it uses the `LOCATION` value. Set to `global` for preview models.
- **Image field**: Only used with multimodal prompts. Leave blank for text-only. The field value must be a Cloud Storage URL (`gs://...`).
- **Re-triggering**: Documents with an existing `output` field or `status.state` of `PROCESSING`/`COMPLETED`/`ERRORED` are skipped. Delete and recreate the document to re-trigger.
- **Handlebars variables**: All variables in `PROMPT` must have corresponding string fields in the document. Missing or non-string fields cause errors.
