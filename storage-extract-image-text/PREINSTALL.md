This extension extracts text from jpg or png images uploaded to Cloud Storage and writes the extracted text to Firestore, using the Cloud Vision API.

On install, you will be asked to provide a Cloud Storage bucket where files will be uploaded, and a Firestore collection to write extracted text back to.

Whenever a new jpg or png image is uploaded to the specified bucket, a Cloud Function will trigger that calls the Cloud Vision API to extract text, and stores the result in a new document with the ID matching the name of the file which was uploaded. (If the file was in a subfolder, the forward slashes will be converted to underscores.)

### Use Cases

- **Optical character recognition (OCR) for scanned documents**: Extract and store text from scanned documents to make them searchable and accessible in your application.
- **Reading text from images in a social media app**: Automatically extract and analyze text from user images to identify trends or inappropriate content.
- **Extracting menu items from restaurant images**: Create a food ordering app that allows users to upload images of menus and automatically extracts and displays the menu items in a structured format.

### Including Cloud Storage paths

The extension provides a `include path list` parameter. Setting this parameter will restrict the extension to only extract text from images in specific locations in your Storage bucket.

If this parameter is not set, then images uploaded to all paths from the given bucket will trigger text extraction.

For example, specifying the paths `/users/pictures,/restaurants/menuItems` will extract text from any images found in any subdirectories of `/users/pictures` and `/restaurants/menuItems`. You may also use wildcard notation for directories in the path.

### Excluding Cloud Storage paths

Alternatively, the extension also provides a `exclude path list` parameter. This parameter is a list of absolute paths not included for extract text from images.

Setting is will ensure the extension does not extract text from images in the specific locations.

For example, to exclude the images stored in the `/foo/alpha` and its subdirectories and `/bar/beta` and its subdirectories, specify the paths `/foo/alpha,/bar/beta`. You may also use wildcard notation for directories in the path.

### Detail

The extension also allows you to control whether you would like to store just extracted text, or all returned metadata from Cloud Vision AI. If set to "basic" the extension will simply write the extracted text as a string field. If set to "full" then the full information returned from Cloud Vision AI will be written to the Firestore document.

## Additional Setup

Ensure you have a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [Cloud Storage bucket](https://firebase.google.com/docs/storage) set up in your Firebase project.

## Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

- [Cloud Vision AI](https://cloud.google.com/vision#section-11)
- Cloud Storage
- Cloud Firestore
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier (Blaze) billing plan is required because the extension uses Cloud Vision API.
