## Version 0.1.10

fix - bump to nodejs20 runtime in functions and run npm audit fix

## Version 0.1.9

fix - update asia-southeast (Singapore) location value

## Version 0.1.8

docs - updates to POSTINSTALL

## Version 0.1.7

fixed - correct apiEndpoint

fixed - updated regex validation for collection paths (#133)

feature - switch PaLM provider (#120)

feature - added shard & machine configuration for creating an index (#108)

fixed - delete backfilling bucket if it exists

fixed - validation regex for `fields` (#47)

## Version 0.1.6

- Feat switch PaLM provider
- Feat added shard and machine configuration for creating an index

## Version 0.1.5

- Fixed CHANGELOG to reflect current state of extension.
- Fixed an issue with `queryIndex` where it didn't accept a list as documented.
- Fixed an issue when uninstalling the extension and installing again where it complains about the Firestore metdata collection already existing.
- Fixed an issue when uninstalling the extension and installing again with a different location.

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
