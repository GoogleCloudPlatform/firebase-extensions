## Version 0.0.20

- feat: default to Gemini 3.6 Flash; Genkit accepts current Gemini 3.x ids without throwing `Model not found.` Gemini 2.5 models retire in October 2026.
- feat: default `VERTEX_AI_MODEL_LOCATION` to `global`. Gemini 3.x is only served from the Vertex AI `global`, `us` and `eu` endpoints, so the previous "same as Cloud Functions location" default would fail for the new default model.
- docs: note that Gemini 3.x deprecates `TEMPERATURE`, `TOP_P` and `TOP_K`; custom values are ignored. They still apply to Gemini 2.5 models.
- fix: the legacy Vertex AI client, used when `CANDIDATE_COUNT` is above one, now reaches the `global` endpoint. It builds `<location>-aiplatform.googleapis.com`, which does not resolve for `global`.
- fix: the legacy clients skip thought parts when reading candidates instead of assuming `parts[0]`, so thinking models no longer store a thought summary or crash on a thought-only candidate.
- fix: add a loose `validationRegex` to `MODEL` so a mistyped id is rejected at install time rather than failing on every write.
- refactor: one shared predicate decides both which client serves a request and whether the `candidates` field is written, so the two cannot drift.

## Version 0.0.19

- chore: bump Cloud Functions runtime to Node.js 22
- chore: run npm audit fix

## Version 0.0.18

- chore: updated default model to Gemini 2.5 Flash, due to upcoming discontinuation of Gemini 2.0 Flash

- feat: Allow configuring Vertex AI API location independently from Cloud Functions location

- chore: update and audit packages

- chore: remove flaky assertions from emulator tests

## Version 0.0.17

- feat: Add support for Gemini 3 Pro Preview

## Version 0.0.16

- feat: add support for Gemini 2.5 Flash Lite

## Version 0.0.15

- feat: Add support for Gemini 2.5 models

- chore: update and audit packages

- chore: ensure consistent naming convention for Genkit Monitoring

## Version 0.0.14

- feat: improve extension logging

- feat: add Genkit monitoring

## Version 0.0.13

- feat: support Gemini Flash Lite Preview on Vertex AI

## Version 0.0.12

- feat: support Gemini 2.0 models

- feat: use nodejs20 runtime and run npm audit fix

- chore: bump genkit version

- fix: change sort order for correct default behavior

## Version 0.0.11

- refactor: use Firebase Genkit SDK to access Gemini API

- fix: update default Gemini models

## Version 0.0.10

- Add docs on regional support for Gemini APIs

- Fixed: dependency vulnerabilties and SDK bumps

## Version 0.0.9

- fix typo in documentation

## Version 0.0.8

- Update documentation

## Version 0.0.7

- Update documentation
- Update extensions display name

## Version 0.0.6

- Make model a string param, to allow for future changes to model names.

- Add maxOutputTokens parameter

- Update documentation

- Add safety threshold params

## Version 0.0.5

- Add Vertex AI provider

## Version 0.0.4

- Fix context parameter

## Version 0.0.3

- Update docs to describe provider param correctly

## Version 0.0.2

- Update the display name of the extension to `Chatbot with Gemini`.

## Version 0.0.1

Initial release of the firestore-genai-chatbot extension.
