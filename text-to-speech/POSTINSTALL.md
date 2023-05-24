## See it in action

test

This extension will automatically convert text from Firestore documents into speech and save the generated audio files in Cloud Storage for Firebase.

To use this extension, ensure that each document in the specified Firestore collection contains a text field with the content you want to convert to speech.

If you enabled per-document overrides during installation, you can also include fields such as languageCode, ssmlGender, audioEncoding, and voiceName in the document for customization.

## Example Usage

```javascript
admin
  .firestore()
  .collection("${param:COLLECTION_PATH}")
  .add({
    text: "Hello, world!",
    languageCode: "en-US", // Optional if per-document overrides are enabled
    ssmlGender: "FEMALE", // Optional if per-document overrides are enabled
    audioEncoding: "MP3", // Optional if per-document overrides are enabled
    voiceName: "en-US-Wavenet-A" // Optional if per-document overrides are enabled
  });
```

## Access generated audio files

Once the extension is installed, it will automatically process new documents in the ${param:COLLECTION_PATH} collection and store the resulting audio files in your `${param:BUCKET_NAME}` Cloud Storage bucket at the `${param:STORAGE_PATH}` path.

The files will be named using the document ID with an appropriate file extension (e.g., .mp3 for MP3 files).

## Error handling

If there are any errors during the text-to-speech conversion process, the extension will log the error message in the Cloud Functions logs. Make sure to monitor these logs and handle any errors appropriately in your application.

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
