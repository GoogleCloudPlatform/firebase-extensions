# Label Images with Cloud Vision AI

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Extracts labels from images and saves to Firestore using Cloud Vision API.



**Details**: This extension will label (classify) any images uploaded to a specific Cloud Storag bucket and write the labels to Firestore.

# Detailed configuration information

This extension provides the following paramters for you to configure its behaviour:

### Cloud Storage Bucket
Set this configuration parameter to specify which Cloud Storage bucket will you upload images on which you want to perform labeling.
### Include Path List

Setting this parameter will restrict storage-image-labeling to only label images in specific locations in your Storage bucket by supplying a comma-separated list of absolute paths.

For example, specifying the paths `/users/pictures,/restaurants/menuItems` will label any images found in any subdirectories of `/users/pictures` and `/restaurants/menuItems`. You may also use wildcard notation for directories in the path.

### Exclude Path List

This parameter is a list of absolute paths not included for labelled images.

Setting is will ensure storage-image-labeling does not label images in the specific locations.

For example, to exclude the images stored in the `/foo/alpha` and its subdirectories and `/bar/beta` and its subdirectories, specify the paths `/foo/alpha,/bar/beta`. You may also use wildcard notation for directories in the path.

### Collection Path

Set this parameter to specify which collection in Firestore the extension should write labels to.

### Label Mode

This parameter sets how much label information should be written to Firestore. If set to "basic" the extension will simply write the list of labels as a string array. If set to "full" then the full information returned from Cloud Vision will be written to the Firestore document.

# Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

<!-- List all products the extension interacts with -->

- Cloud Functions
- Cloud Vision API
- Cloud Storage
- Cloud Firestore

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
