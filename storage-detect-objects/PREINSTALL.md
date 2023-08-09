This extension detects objects in jpg or png images uploaded to Cloud Storage and writes the detected objects to Firestore, using the Cloud Vision API.

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
