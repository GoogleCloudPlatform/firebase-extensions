## Try It Out

1. Visit the [Firebase Storage page](https://console.firebase.google.com/project/_/storage) on Console and upload a new image to the `${param:IMG_BUCKET}` bucket.
2. Visit the [Firebase Firestore page](https://console.firebase.google.com/project/_/firestore) on Console and click into the `${param:COLLECTION_PATH}` collection.
3. Wait a few seconds for the trigger to fully execute. Afterwards, you should see a new document with the ID matching the name of the file which was uploaded. You should see the detected objects and the original Google Storage URL stored within the document.

## Using the extension

You can upload images using the [Cloud Storage for Firebase SDK](https://firebase.google.com/docs/storage/) for your platform (iOS, Android, or Web). Alternatively, you can upload images directly in the Firebase console's Storage dashboard.

Whenever you upload an image to the specified bucket and directory, this extension will process any images uploaded to a specific Cloud Storage bucket and write the detected objects to Firestore, under the name of the file that was uploaded.

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
