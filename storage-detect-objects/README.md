# Detect Objects with Cloud Vision AI

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Detects multiple objects from provided images and saves them to Firestore using Cloud Vision API.



**Details**: This extension detects objects in jpg or png images uploaded to Cloud Storage and writes the detected objects to Firestore, using the Cloud Vision API.

On install, you will be asked to provide a Cloud Storage bucket where files will be uploaded, and a Firestore collection to write detected objects back to.

Whenever a new jpg or png image is uploaded to the specified bucket, a Cloud Function is triggered that calls the Cloud Vision API to detect objects, and stores the result in document that has a `file` field with the full `gs://` path of the file in Cloud Storage.

To access the resulting detected objects, you will need to use a query to find the correct document. In JavaScript the query would look like this:

```js
firebase
  .firestore()
  .collection(config.collectionPath) // 👈 the collection you configured
  .where('file', '==', filePath) // 👈 the uploaded file, in format: "gs://${object.bucket}/${object.name}"
  .get();
```

### Use Cases

Here are some ways to use object detection in your application:

- **E-commerce:** Extract multiple products from images for better search discovery and recommendations.
- **Content filtering:** Analyze and understand image content to filter out irrelevant or inappropriate content from search results.
- **Image and video search:** Enable search algorithms to understand image content and search results based on visual data.
- **Surveillance and security:** Improve real-time alert systems in detecting anomalies or specific activities by interpreting detected objects/people.
- **Assistance for visually impaired users:** Provide accurate descriptions of images to enhance the digital experience for visually impaired users.

## Additional Setup

Ensure you have a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [Cloud Storage bucket](https://firebase.google.com/docs/storage) set up in your Firebase project.

## Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

- Cloud Vision API
- Cloud Storage
- Cloud Firestore
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier (Blaze) billing plan is required because the extension uses Cloud Vision API.




**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? You usually want a location close to your database. Realtime Database instances are located in `us-central1`. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Cloud Storage bucket for images: To which Cloud Storage bucket will you upload images on which you want to perform object detection?


* Paths containing images in which you want to detect objects: Restrict storage-detect-objects to only process images in specific locations in your Storage bucket by  supplying a comma-separated list of absolute paths. For example, specifying the paths `/users/pictures/restaurants/menuItems` will process any images found in any subdirectories of `/users/pictures` and `/restaurants/menuItems`.
You may also use wildcard notation for directories in the path. For example, `/users/*/pictures` would include any images in any subdirectories of `/users/foo/pictures` as well as any images in subdirectories of `/users/bar/pictures`, but also any images in subdirectories of `/users/any/level/of/subdirectories/pictures`. 
If you prefer not to explicitly exclude any directories of your Storage bucket, leave this field empty.


* List of absolute paths *not* enabled for object detection: Ensure storage-detect-objects does *not* process images in _specific locations_ in your Storage bucket by  supplying a comma-separated list of absolute paths. For example, to *exclude* the images  stored in the `/foo/alpha` and its subdirectories and `/bar/beta` and its subdirectories, specify the paths `/foo/alpha,/bar/beta`.
You may also use wildcard notation for directories in the path. For example, `/users/*/pictures` would exclude any images in any subdirectories of `/users/foo/pictures` as well as any images in subdirectories of `/users/bar/pictures`, but also any images in subdirectories of `/users/any/level/of/subdirectories/pictures`.
If you prefer to detect objects in every image uploaded to your Storage bucket, leave this field empty.


* Collection path: What is the path to the collection where detected objects will be written to?


* Amount of detected object information to write to firestore.: How much information about detected objects should be written to firestore?  Do you want just the recognized object names written to firestore, or the full object annotation? Select \"basic\" for the former, \"full\" for the latter.




**Cloud Functions:**

* **detectObjects:** Listens to incoming Storage documents, executes object detection on them and writes recognized objects back to Storage into a preconfigured location.



**APIs Used**:

* vision.googleapis.com (Reason: Powers all Vision tasks performed by the extension.)



**Access Required**:



This extension will operate with the following project IAM roles:

* storage.objectAdmin (Reason: Allows the extension to write to your Cloud Storage.)

* datastore.user (Reason: Allows the extension to write to your Firestore Database instance.)
