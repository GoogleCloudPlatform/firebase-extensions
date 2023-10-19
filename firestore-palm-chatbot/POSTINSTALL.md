## Testing the extension

You can test out the extension right away by following these steps:

1. Go to the [Cloud Firestore dashboard](https://console.firebase.google.com/project/_/firestore) in the Firebase console.
2. If it doesn't already exist, create the collection you specified during installation: **${param:COLLECTION_NAME}**.
3. Add a document with a **${param:PROMPT_FIELD}** field containing your first message:

```
${param:PROMPT_FIELD}: "How are you today?"
```

4. In a few seconds, you'll see a ${param:ORDER_FIELD} field and then a status field should appear in the document. The status field will update as the extension processes the message.
5. When processing is finished, the ${param:RESPONSE_FIELD} field of the document should be populated with the response from the PaLM API.

```javascript
const ref = await admin
    .firestore()
    .collection("${param:COLLECTION_NAME}")
    .add({
        ${param:PROMPT_FIELD}: "How are you today?",
    })

ref.onSnapshot(snap => {
    if (snap.get('${param:RESPONSE_FIELD}')) console.log(
        'RESPONSE:' +
        snap.get('${param:RESPONSE_FIELD}')
    )
})
```

## About the models

The extension gives you a choice of PaLM API provider

- The Vertex AI PaLM API: For more details on the Vertex AI PaLM API, see the [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview)

- The Generative Language for Developers PaLM API [PaLM API](https://developers.generativeai.google/guide/palm_api_overview).

## Handling errors

If the extension encounters an error, it will write an error message to the document in `status` field. You can use this field to monitor for errors in your documents.

### Handling `ACCESS_TOKEN_SCOPE_INSUFFICIENT` error

If the error message is `The project or service account likely does not have access to the PaLM API`, please ensure that you have already signed up for the [waitlist](https://makersuite.google.com/waitlist) and have been approved before installing the extension.

Then, you need to add the PaLM API to your project. You can do this by going to the [PaLM API page](https://console.cloud.google.com/apis/library/language.googleapis.com) in the Google Cloud Console and clicking "Enable".

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
