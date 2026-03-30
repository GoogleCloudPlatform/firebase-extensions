# Storage-Triggered Extensions

## Extension Reference

| Extension | Bucket Param | Input | Output | Trigger |
|-----------|-------------|-------|--------|---------|
| storage-label-images | `IMG_BUCKET` | Image file (PNG, JPG) | Firestore `imageLabels` collection | object.finalize |
| storage-label-videos | `INPUT_VIDEOS_BUCKET` | Video file | JSON in `OUTPUT_BUCKET` | object.finalize |
| storage-extract-image-text | `IMG_BUCKET` | Image file (PNG, JPG) | Firestore `extractedText` collection | object.finalize |
| storage-reverse-image-search | `IMG_BUCKET` | Image file | Vertex AI index embeddings | object.finalize + object.delete |
| storage-transcode-videos | `INPUT_VIDEOS_BUCKET` | Video file | Transcoded video in `OUTPUT_VIDEOS_BUCKET` | object.finalize |
| speech-to-text | `EXTENSION_BUCKET` | Audio file (WAV, FLAC, MP3) | `.txt` file in Storage + optional Firestore | object.finalize |

## Uploading Files to the Storage Emulator

The Storage emulator runs on port 9199. You can upload files using the Firebase Storage REST API:

```bash
BUCKET="demo-gcp.appspot.com"
FILE_PATH="test-image.png"
STORAGE_PATH="images/test.png"

# Upload via the Storage emulator REST API
curl -X POST \
  "http://127.0.0.1:9199/v0/b/${BUCKET}/o?name=${STORAGE_PATH}" \
  -H "Content-Type: image/png" \
  --data-binary @"${FILE_PATH}"
```

You can also use `gsutil` with the emulator:

```bash
export STORAGE_EMULATOR_HOST="http://127.0.0.1:9199"
gsutil cp test-image.png gs://demo-gcp.appspot.com/images/test.png
```

## Verifying Output

### Firestore Output (label-images, extract-image-text)

These extensions write results to a Firestore collection:

```bash
# Check for labeled image results
./scripts/read-firestore-doc.sh imageLabels

# Check for extracted text results
./scripts/read-firestore-doc.sh extractedText
```

### Storage Output (label-videos, transcode-videos)

These extensions write output files to a storage bucket. List bucket contents:

```bash
curl -sf "http://127.0.0.1:9199/v0/b/demo-gcp.appspot.com/o" | jq '.items[].name'
```

## Test Fixtures

Some extensions have test fixtures committed to the repo:

- `storage-label-images/functions/__tests__/fixtures/test.png`
- `speech-to-text/functions/__tests__/fixtures/test.wav`

You can use these for manual testing.

## Path Filtering

Several storage extensions support `INCLUDE_PATH_LIST` and `EXCLUDE_PATH_LIST` params. When testing, make sure your upload path matches the include filter (or doesn't match the exclude filter).
