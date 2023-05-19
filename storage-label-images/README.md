# Label Images with Cloud Vision AI

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Extracts labels from images and saves to Firestore using Cloud Vision API.



**Details**: This extension extracts text from jpg or png images uploaded to Cloud Storage and writes the extracted labels to Firestore, using the Cloud Vision API.

On install, you will be asked to provide a Cloud Storage bucket where files will be uploaded, and a Firestore collection to write extracted labels back to.

Whenever a new jpg or png image is uploaded to the specified bucket, a Cloud Function is triggered that calls the Cloud Vision API to extract labels, and stores the result in document that has a `file` field with the full `gs://` path of the file in Cloud Storage.

To access the resulting labels, you will need to use a query to find the correct document. In JavaScript the query would look like this:
```js
firebase
  .firestore()
  .collection(config.collectionPath) // 👈 the collection you configured
  .where('file', '==', filePath)     // 👈 the uploaded file, in format: "gs://${object.bucket}/${object.name}"
  .get();
```
### Use Cases

Here are some ways to use image labeling in your application:

* **E-commerce:** Extract tags from product images for better search discovery and recommendations.
* **Content filtering:** Analyze and understand image content to filter out irrelevant or inappropriate content from search results.
* **Image and video search:** Enable search algorithms to understand image content and search results based on visual data.
* **Surveillance and security:** Improve real-time alert systems in detecting anomalies or specific activities by interpreting image labels.
* **Assistance for visually impaired users:** Provide accurate descriptions of images to enhance the digital experience for visually impaired users.

## Additional Setup

Ensure you have a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [Cloud Storage bucket](https://firebase.google.com/docs/storage) set up in your Firebase project.

## Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

* Cloud Vision API
* Cloud Storage
* Cloud Firestore
* Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier (Blaze) billing plan is required because the extension uses Cloud Vision API.




**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. Realtime Database instances are located in `us-central1`. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Cloud Storage bucket for images: To which Cloud Storage bucket will you upload images on which you want to perform labelling?


* Paths that contain images you want to label: Restrict storage-image-labeling to only label images in specific locations in your Storage bucket by  supplying a comma-separated list of absolute paths. For example, specifying the paths `/users/pictures,/restaurants/menuItems` will label any images found in any subdirectories of `/users/pictures` and `/restaurants/menuItems`.
You may also use wildcard notation for directories in the path. For example, `/users/*/pictures` would exclude any images in any subdirectories of `/users/foo/pictures` as well as any images in subdirectories of `/users/bar/pictures`, but also any images in subdirectories of `/users/any/level/of/subdirectories/pictures`. 
If you prefer not to explicitly exclude any directories of your Storage bucket, leave this field empty.


* List of absolute paths not included for labelled images: Ensure storage-image-labeling does *not* label images in _specific locations_ in your Storage bucket by  supplying a comma-separated list of absolute paths. For example, to *exclude* the images  stored in the `/foo/alpha` and its subdirectories and `/bar/beta` and its subdirectories, specify the paths `/foo/alpha,/bar/beta`.
You may also use wildcard notation for directories in the path. For example, `/users/*/pictures` would exclude any images in any subdirectories of `/users/foo/pictures` as well as any images in subdirectories of `/users/bar/pictures`, but also any images in subdirectories of `/users/any/level/of/subdirectories/pictures`.
If you prefer to label every image uploaded to your Storage bucket,  leave this field empty.


* Collection path: What is the path to the collection where labels will be written to?


* Amount of label information to write to firestore.: How much label information should be written to firestore? Do you want just the label descriptions written to firestore,  or the full label annotation? Select \"basic\" for the former, \"full\" for the later.




**Cloud Functions:**

* **labelImage:** Listens to incoming Storage documents, executes image labeling on them and writes labels back to Storage into a preconfigured location.



**APIs Used**:

* vision.googleapis.com (Reason: Powers all Vision tasks performed by the extension.)



**Access Required**:



This extension will operate with the following project IAM roles:

* storage.objectAdmin (Reason: Allows the extension to write to your Cloud Storage.)

* datastore.user (Reason: Allows the extension to write to your Firestore Database instance.)
