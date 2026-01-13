## Version 0.1.7

fix - "latest" document now updates for all run states (SUCCEEDED, FAILED, etc.), not just successful runs

fix - use Firestore transaction in `updateLatestRunDocument` to prevent race conditions from concurrent Pub/Sub messages

fix - allow same-runId updates to handle Pub/Sub redelivery edge cases

fix - explicit zero counts (`failedRowCount: 0, totalRowCount: 0`) for failed/non-success runs for clearer API shape

fix - add resource name validation with descriptive error messages for malformed transfer config/run names

fix - add error handling for BigQuery query failures with proper logging

fix - `getTransferConfig` now properly distinguishes between "not found" (returns null) and API errors (throws)

fix - add null/undefined validation for transfer config structure before accessing nested properties

fix - all error paths now set `PROCESSING_FAILED` state before throwing for better visibility

refactor - add logging for skipped latest updates, non-success run handling, and query failures

test - reorganize test structure and improve test coverage

fix - bump dependencies to fix vulnerabilities

## Version 0.1.6

fix - handle empty partitioning values in reconfiguration correctly

refactor - improve type safety

test - add e2e test coverage

## Version 0.1.5

chore - remove irrelevant dependencies

feat - bump to nodejs20 runtime

fix - bump dependencies to fix vulnerabilities

## Version 0.1.4

Updated PREINSTALL for readability.

## Version 0.1.3

Add icon and tags to extension.yaml.

## Version 0.1.2

- Fix icon.
- Fix PREINSTALL and README docs.

## Version 0.1.1

- Fix PREINSTALL formatting.
- Fix processing message during install/update/configure lifecycle hooks.

## Version 0.1.0

Initial release.

## Version 0.0.2

Updated configuration descriptions

## Version 0.0.1

Initial release of the firestore bigquery export prototype
