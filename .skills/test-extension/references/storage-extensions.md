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

## Uploading Files

Upload files to the extension's configured bucket using `gsutil`:

```bash
# Upload an image
gsutil cp test-image.png gs://<bucket-name>/images/test.png

# Upload an audio file
gsutil cp test-audio.wav gs://<bucket-name>/audio/test.wav
```

Or using the Firebase CLI:

```bash
firebase storage:upload test-image.png --bucket <bucket-name> --path images/test.png --project $PROJECT_ID
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

These extensions write output files to a storage bucket:

```bash
gsutil ls gs://<output-bucket-name>/
```

## Test Fixtures

Some extensions have test fixtures committed to the repo:

- `storage-label-images/functions/__tests__/fixtures/test.png`
- `speech-to-text/functions/__tests__/fixtures/test.wav`

You can use these for manual testing against a real project.

## Path Filtering

Several storage extensions support `INCLUDE_PATH_LIST` and `EXCLUDE_PATH_LIST` params. When testing, make sure your upload path matches the include filter (or doesn't match the exclude filter). Check the installed extension's configuration for the actual values.
