## Version 0.1.5

- Fixed CHANGELOG to reflect current state of extension.
- Fixed an issue with `queryIndex` where it didn't accept a list as documented.
- Fixed an issue when uninstalling the extension and installing again where it complains about the Firestore metdata collection already existing.

## Version 0.1.4

- Updated PREINSTALL to include link Google Cloud docs on undeploying indexes.
- Documented model limits better in POSTINSTALL.

## Version 0.1.3

Updated the validation for the `Fields` parameter to allow more Firestore field names format.

## Version 0.1.2

Add warning about waitlist.

## Version 0.1.1

Fixed a bug where disabling backfill still tries to process images prior to extension installation.

## Version 0.1.0

Initial release of the firestore-semantic-search extension.
