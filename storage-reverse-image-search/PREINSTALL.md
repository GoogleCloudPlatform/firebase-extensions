

This extension adds reverse image search to your Firebase application using Vertex AI’s [Vector Search](https://cloud.google.com/vertex-ai/docs/vector-search/overview) and Cloud Storage. Reverse image search relies on first generating feature vector representations of your original images which are stored in a Vector Search index. Once these feature vectors are indexed, Vector Search can be used to calculate similar images to an original image from a large dataset of candidate images, based on vector distance measures.

On installation, you will need to specify a Cloud Storage **bucket** and **files path** for indexing.

Once installed, the extension does the following:

- Automatically generates and stores feature vectors in Vertex AI whenever images are created, updated, or deleted in target Storage path(s)
- Provides a secure API endpoint to query similar images (given an input image) that can be used by client applications
- (Optional) Backfills existing data from target Storage path(s)

The query API endpoint is deployed as a [Firebase Callable Function](https://firebase.google.com/docs/functions/callable), and requires that you are signed in with a [Firebase Auth](https://firebase.google.com/docs/auth) user to successfully call the Function from your client application.

To detect whether an object in Storage is an image or not, the extension checks that the object’s extension matches one of the following supported file extensions: `jpg`, `jpeg`, `png`, `gif`, `bmp`.

### Features vector models

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
- [Vertex AI](https://cloud.google.com/vertex-ai/pricing#vector-search)
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing](https://firebase.google.com/pricing).

> ⚠️ The extension does not delete the Vector Search Index automatically when you uninstall the extension. Vertex AI charges by node hour when hosting a Vector Search Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available [here](https://cloud.google.com/vertex-ai/docs/vector-search/deploy-index-public#undeploy-index). You can [read more about Vector Search pricing here](https://cloud.google.com/vertex-ai/pricing#vector-search).
