## Version 0.1.6

fixed - autopagination issue (#103)

## Version 0.1.5

fixed - metadata & enqueues collection merge (#140)

feature - shard & machineSpec

fixed - backfill failing to create metdata doc thus index (#28)

## Version 0.1.4

- Feature: shard and machine configurations.
- Fix: use `set` to create enqueues in Firestore to avoid errors from past installs.

## Version 0.1.3

Updated PREINSTALL to include link Google Cloud docs on undeploying indexes.

## Version 0.1.2

Fixed a bug where disabling backfill still tries to process images prior to extension installation.

## Version 0.1.1

Fixed bug where backfill failed to create metdata doc thus also not creating the index.

## Version 0.1.0

Initial release of the storage-reverse-image-search extension.
