# Firestore-Triggered Extensions

## Extension Reference

| Extension | Collection (default) | Input | Response Field | Trigger |
|-----------|---------------------|-------|---------------|---------|
| firestore-multimodal-genai | `generate` | Handlebars vars from PROMPT + optional IMAGE_FIELD | `output` | document.write |
| firestore-genai-chatbot | `generate` | `prompt` field | `response` | document.write |
| firestore-vector-search | `products` | `input` field | `embedding` | document.write |
| firestore-semantic-search | (configured at install) | Fields from FIELDS param | Vertex AI index | document.create |
| firestore-palm-chatbot | `users/{uid}/discussions/{id}/messages` | `prompt` field | `response` | document.write |
| firestore-palm-gen-text | `generate` | Handlebars vars from PROMPT | `output` | document.write |
| firestore-palm-summarize-text | `text_documents` | `text` field | `summary` | document.write |
| firestore-incremental-capture | (wildcard `{document=**}`) | Any document fields | BigQuery export | document.write |
| text-to-speech | (configured at install) | `text` field | Audio in Cloud Storage | document.write |

## Example Test Workflows

### firestore-multimodal-genai

The extension substitutes handlebars variables from the document into the configured PROMPT.

```bash
export PROJECT_ID="<your-project>"

# If PROMPT is "What is the capital of {{ country }}?"
./scripts/write-firestore-doc.sh generate '{"country": "France"}'

# If PROMPT is a static prompt with no variables
./scripts/write-firestore-doc.sh generate '{"dummy": "trigger"}'

# Watch for completion (use the doc ID from write output)
./scripts/watch-status.sh generate/<doc-id> COMPLETED

# Read the result
./scripts/read-firestore-doc.sh generate/<doc-id>

# Clean up
./scripts/delete-firestore-doc.sh generate/<doc-id>
```

### firestore-genai-chatbot

The chatbot extension expects a `prompt` field and writes to `response`.

```bash
./scripts/write-firestore-doc.sh generate '{"prompt": "Hello, how are you?"}'
./scripts/watch-status.sh generate/<doc-id> COMPLETED
./scripts/read-firestore-doc.sh generate/<doc-id>
```

For multi-turn conversations, documents are ordered by `createTime` within the collection path. Each new document in the same subcollection continues the conversation.

### firestore-vector-search

Expects an `input` field and generates an `embedding` field.

```bash
./scripts/write-firestore-doc.sh products '{"input": "A comfortable ergonomic office chair"}'
./scripts/watch-status.sh products/<doc-id> COMPLETED
```

## Common Gotchas

- **Document won't trigger**: The response field (e.g. `output`) must NOT already exist on the document
- **Status blocking**: If `status.state` is already `PROCESSING`, `COMPLETED`, or `ERRORED`, the extension skips the document
- **Re-triggering**: Delete the document and create a new one, or clear both the response field and the status field
- **Handlebars**: If the PROMPT uses `{{ variable }}`, the document MUST have a field named `variable` with a string value
- **Missing variables**: The extension will error if a handlebars variable is referenced in PROMPT but missing from the document
- **Collection path**: Check the installed extension's configuration for the actual collection path — it may differ from defaults
