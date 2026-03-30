# Agent Instructions

## Repo Overview

Monorepo of **Firebase Extensions** — self-contained Cloud Functions packages that users install into their Firebase projects. Managed with Lerna. Each extension lives in its own top-level directory with an `extension.yaml` manifest, `functions/` source code, and documentation files (PREINSTALL.md, POSTINSTALL.md, CHANGELOG.md, README.md).

### Extension Types

**Firestore-triggered** (document write/create): firestore-multimodal-genai, firestore-genai-chatbot, firestore-vector-search, firestore-semantic-search, firestore-palm-chatbot, firestore-palm-gen-text, firestore-palm-summarize-text, firestore-incremental-capture, text-to-speech

**Storage-triggered** (object finalize): storage-label-images, storage-label-videos, storage-extract-image-text, storage-reverse-image-search, storage-transcode-videos, speech-to-text

**Other**: bigquery-firestore-export (Pub/Sub), palm-secure-backend (HTTPS callable)

## Development Workflow

Each extension's code lives in `<extension>/functions/`. Common commands:

```bash
cd <extension>/functions
npm install          # install dependencies
npm run build        # compile TypeScript
npm test             # run tests (requires emulator for integration tests)
npm run generate-readme  # regenerate README.md from extension.yaml + PREINSTALL.md
```

Root-level commands (via Lerna):

```bash
npm run compile      # build all extensions
npm run test         # start emulator + run all tests
npm run test:local   # run tests without starting emulator (emulator must already be running)
```

## Release Conventions

- Version lives in `extension.yaml` (`version:` field)
- Update CHANGELOG.md with a new version section at the top
- README.md is auto-generated — run `npm run generate-readme` in `functions/`, never edit README.md manually
- PREINSTALL.md and POSTINSTALL.md are the source-of-truth documentation files

## Emulator

The Firebase emulator config lives in `_emulator/`. Ports:

| Service    | Port |
|------------|------|
| Firestore  | 8080 |
| Storage    | 9199 |
| Auth       | 9099 |
| Pub/Sub    | 8085 |
| Functions  | 5001 |
| Hub        | 4000 |
| Hosting    | 8081 |

Extension environment configs are in `_emulator/extensions/*.env`.

## Manual Testing

Use the **test-extension** skill (`.skills/test-extension/`) for full-lifecycle manual testing of extensions — building, emulator setup, writing test data, triggering, and verifying output. This is the recommended approach for end-to-end testing during development.
