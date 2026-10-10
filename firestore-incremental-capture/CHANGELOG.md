## Version 0.0.13

fix: download the restoration pipeline from a pinned release instead of the main branch

The install script fetched the Dataflow jar from `raw/main`, so every install
resolved to whatever build sat at that path at the time it ran. It now downloads
a release pinned to this extension version and verifies its SHA-256.

Existing installations are unaffected until they upgrade: the jar previously
served from `main` is frozen and still resolves for older versions. Upgrading is
recommended - the pinned build is the tested one, and the frozen jar targets an
Apache Beam SDK that Dataflow deprecated in October 2024.

fix: stop the download step aborting the rest of the setup script

`run.sh` sources this step, so its fallback `exit 0` ended the whole run and
skipped PITR, Firestore, Artifact Registry, service account and template setup
while reporting success.

## Version 0.0.12

chore: complete runtime migration to Node.js 22

## Version 0.0.11

chore: bump runtime to Node.js 22
chore: npm run audit

## Version 0.0.10

chore: bump dependencies to fix vulnerabilities

## Version 0.0.9

chore: bump dependencies

## Version 0.0.8

chore: update and audit packages

## Version 0.0.7

fixed: bump to nodejs20 runtime in functions and run npm audit fix

fixed: support new default bucket suffix

## Version 0.0.6

fixed - deployment, documentation and scripting updates

## Version 0.0.5

docs: fix POSTINSTALL instruction scripts, improve backup instance id param and regexes

## Version 0.0.4

docs: update PREINSTALL, display name, and icon.

refactor: removed legacy code

## Version 0.0.3

docs: Add author and contributors field, add license headers

## Version 0.0.2

docs: Add to the PREINSTALL.md and generate README.md

## Version 0.0.1

Initial release of the firestore-incremental-capture extension.
