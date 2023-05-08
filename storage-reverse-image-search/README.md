# Reverse Image Search with Vertex AI

**Author**: Firebase (**[https://firebase.google.com](https://firebase.google.com)**)

**Description**: Search images in Cloud Storage using Vertex Matching Engine.



**Details**: > :warning: Note: The Vertex [Matching Engine public endpoints](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public) are currently in public preview.

## How this extension works

This extension adds reverse image search to your Firebase application using Vertex AI’s [Matching Engine](https://cloud.google.com/vertex-ai/docs/matching-engine/overview) and Cloud Storage. Reverse image search relies on first generating feature vector representations of your original images which are stored in a Matching Engine index. Once these feature vectors are indexed, the Matching Engine can be used to calculate similar images to an original image from a large dataset of candidate images, based on vector distance measures.

On installation, you will need to specify a Cloud Storage **bucket** and **files path** for indexing.

Once installed, the extension does the following:

- Automatically generates and stores feature vectors in Vertex AI whenever images are created, updated, or deleted in target Storage path(s)
- Provides a secure API endpoint to query similar images (given an input image) that can be used by client applications
- (Optional) Backfills existing data from target Storage path(s)

The query API endpoint is deployed as a [Firebase Callable Function](https://firebase.google.com/docs/functions/callable), and requires that you are signed in with a [Firebase Auth](https://firebase.google.com/docs/auth) user to successfully call the Function from your client application.

To detect whether an object in Storage is an image or not, the extension checks that the object’s extension matches one of the following supported file extensions: `jpg`, `jpeg`, `png`, `gif`, `bmp`.

## Features vector models

You can either use any pre-existing image [feature vector](https://tfhub.dev/s?module-type=image-feature-vector) model on TensorFlow Hub, or use your own custom model. The extension currently supports any custom TensorFlow.JS model that accepts images and return feature vectors.

If you would like to use a pre-trained model, you simply need to copy the TensorFlow Hub model URL and paste that into the configuration during the installation process.

You may want to use your own custom model, or fine-tune an existing model to achieve better results. To do so, follow these steps:

1. Export your model using the Tensorflow SDK. [You can find more information about exporting the correct format here](https://www.tensorflow.org/js/guide/save_load). After exporting, you should have a `[model].json` file and `[model].weights.bin` file. The `.bin` file might be sharded into multiple binary files, you will need all of them.
2. Upload both the `.json` and `.bin` file(s) to a Cloud Storage page, and make sure both objects are publicly accessible. 
3. Copy the public URL of the .json file and paste that in the extension configuration during installation. The extension will automatically load the `.bin` file(s) based on an inferred relative path to the `.json` file.

You need to know the input dimensionality that your model supports, as the extension needs to resize images before feeding them into the image feature vector model.

## Additional Setup

First, before installing the extension, you need to enable data read & write access in Cloud Audit Log for Vertex AI API. The instructions to enable are as follows:
- [Visit this page](https://console.cloud.google.com/iam-admin/audit?cloudshell=false) and ensure that you have selected the project you’d like to install this extension in, using the project picker.
- Filter for “Vertex AI API” and click on the checkbox next to it. A new panel should appear on the right side of the page.
- On the new panel, click on the checkboxes next to “Data Read” and “Data Write”, and click Save.

Finally, make sure that you've set up a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [enabled Cloud Storage](https://firebase.google.com/docs/storage) in your Firebase project.

After installation, you will need to also add some security rules on a new Firestore collection created by the extension that is used to store internal backfill state. Please check the extension instance after installation for more details.

Note that the extension itself will take **~2h** to finish installing & processing, with a minimum of 40 minutes to create the Index, 60 mins to deploy the Index, and the rest of time to backfill existing data (optional). The total runtime will depend on how large your existing dataset is.

### Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:
- Cloud Firestore
- Cloud Storage
- Cloud Run
- Cloud EventArc
- [Vertex AI](https://cloud.google.com/vertex-ai/pricing#matchingengine)
- Cloud Functions (Node.js 14+ runtime. See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing](https://firebase.google.com/pricing).

> Note 
> 
> The extension does not delete the Matching Engine Index automatically when you uninstall the extension. 
> 
> Vertex AI charges by node hour when hosting a Matching Engine Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available here.
>
> You can [read more about Matching Engine pricing here](https://www.google.com/url?q=https://cloud.google.com/vertex-ai/pricing%23matchingengine&sa=D&source=docs&ust=1683194254385742&usg=AOvVaw1kYFVKa8gdagrau70Vzk6G).





**Configuration Parameters:**

* Cloud Storage bucket for images: Which Cloud Storage bucket will has images you want to index and search?


* The path to images in the bucket: If images is located inside a folder in the bucket, what's the path? If empty the root of the bucket will be used.


* TF Model URL: The URL to the TF model exported to JSON with weights. The URL must be public and points to a directory with `model.json` and `**.bin` files. Check https://www.tensorflow.org/js/guide/save_load for more details.

* Model input shape: The input shape of the model. For example, if the model expects 224x224 images, the input shape is `224,244`.

* Distance measure type: The distance measure used in nearest neighbor search. The default is dot product.  [Read more about distance measures here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#distance-measure-type).

* Algorithm config: The configuration with regard to the algorithms used for efficient search. [Read more about algorithm config here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#tree-ah-config).

* Approximate number of neighbors: The approximate number of neighbors to return in the response. [Read more about this parameter here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#nearest-neighbor-search-config).

* Batch size: The batch size used to generate feature vectors for existing images. The larger the batch size, the more time and memory are required. Do not sit a size larger than 64.

* Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).



**Cloud Functions:**

* **backfillTrigger:** Sets up the Vertex Matching Engine index.

* **backfillTask:** A task-triggered function that gets called before a Vertex Matching Engine index is created. It backfills embeddings for all images in the specified Cloud Storage path.

* **createIndexTrigger:** An event-triggered function that gets called when a special metadata document updated. It checks the status of the backfill every time, and once it's done it will trigger index creation.

* **streamUpdateDatapoint:** An event-triggered function that gets called when a new Image is created or updated. It generates embeddings for the image and updates the Matching Engine index.

* **streamRemoveDatapoint:** An event-triggered function that gets called when a new Image is deleted. It removes the image's datapoint from the Matching Engine index.

* **datapointWriteTask:** A task-triggered function that gets called when a new Image is created or updated but the index isn't ready. It generates embeddings for the image and updates the Matching Engine index.

* **queryIndex:** A function that queries the Vertex Matching Engine index.



**Other Resources**:

* onIndexCreated (firebaseextensions.v1beta.v2function)

* onIndexDeployed (firebaseextensions.v1beta.v2function)



**APIs Used**:

* aiplatform.googleapis.com (Reason: Powers Vertex Matching Engine)

* eventarc.googleapis.com (Reason: Powers all events and triggers)

* run.googleapis.com (Reason: Powers v2 Cloud Functions)

* storage-component.googleapis.com (Reason: Needed to use Cloud Storage)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: This extension requires read/write access to Firestore.)

* storage.admin (Reason: This extension requires write access to Cloud Storage to create a bucket and upload embeddings files to it as part of the backfill.)

* aiplatform.user (Reason: This extension requires access to Vertex AI to create, update and query a Vertex Matching Engine index.)
