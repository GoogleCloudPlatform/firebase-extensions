# Firebase Emulator Reference

## Port Mapping

| Service    | Port | URL |
|------------|------|-----|
| Firestore  | 8080 | http://127.0.0.1:8080 |
| Storage    | 9199 | http://127.0.0.1:9199 |
| Auth       | 9099 | http://127.0.0.1:9099 |
| Pub/Sub    | 8085 | http://127.0.0.1:8085 |
| Functions  | 5001 | http://127.0.0.1:5001 |
| Hub/UI     | 4000 | http://127.0.0.1:4000 |
| Hosting    | 8081 | http://127.0.0.1:8081 |

## Health Check

The emulator hub exposes a health endpoint:

```bash
curl -sf http://127.0.0.1:4000 > /dev/null && echo "Emulator is running" || echo "Emulator is not running"
```

## Environment Variables

Tests expect these environment variables to point to the emulator:

```bash
export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
export STORAGE_EMULATOR_HOST="127.0.0.1:9199"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
export PUBSUB_EMULATOR_HOST="127.0.0.1:8085"
export GCLOUD_PROJECT="demo-gcp"
export PROJECT_ID="demo-gcp"
```

## Emulator Configuration

The emulator config lives in `_emulator/`:

```
_emulator/
├── firebase.json          # Emulator service config and ports
├── .firebaserc            # Project aliases (demo-extensions-testing, dev-extensions-testing)
├── firestore.rules        # Firestore security rules
├── storage.rules          # Storage security rules
├── extensions/            # Extension environment configs
│   ├── firestore-palm-chatbot.env
│   ├── firestore-semantic-search.env
│   ├── storage-image-labeling.env.local
│   └── ...
└── functions/             # Dummy functions project for emulator
    ├── index.js
    └── package.json
```

## Extension Environment Config

Each extension can have an `.env` file in `_emulator/extensions/` that sets its params. Example for `firestore-semantic-search.env`:

```
COLLECTION_NAME=products
EMBEDDING_METHOD=palm
FIELDS=title,description
DISTANCE_MEASURE=SQUARED_L2_DISTANCE
```

## Firebase CLI Commands

```bash
# Start emulator
cd _emulator && firebase emulators:start --project=demo-gcp

# Clear Firestore data
curl -X DELETE "http://127.0.0.1:8080/emulator/v1/projects/demo-gcp/databases/(default)/documents"

# List Firestore documents
curl -sf "http://127.0.0.1:8080/v1/projects/demo-gcp/databases/(default)/documents/<collection>" | jq .

# List Storage objects
curl -sf "http://127.0.0.1:9199/v0/b/demo-gcp.appspot.com/o" | jq '.items[].name'
```

## Clearing Data Between Tests

```bash
# Clear all Firestore data
.skills/test-extension/scripts/clear-firestore.sh

# Clear a specific collection (delete and recreate)
# There's no emulator API for this — clear all data instead

# Clear Storage (no emulator API — restart emulator or delete objects individually)
```

## Troubleshooting

- **Port already in use**: Run `npx kill-port 8080 8085 4000 4400 5001 9199 9000 9099`
- **Emulator won't start**: Check Java is installed (`java -version`), the emulator requires it
- **Tests fail with ECONNREFUSED**: Emulator isn't running or wrong port. Check `FIRESTORE_EMULATOR_HOST`
- **Extension doesn't trigger**: Check that the extension's env file exists in `_emulator/extensions/` and has the correct `COLLECTION_NAME` or bucket config
