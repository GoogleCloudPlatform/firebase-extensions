## Complete your installation

You will need to first add some security rules to a new Firestore collection used for storing backfill state.

Head to [Cloud Firestore Rules](https://console.firebase.google.com/u/0/project/${param:PROJECT_ID}/firestore/rules) page, and add the following rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /_ext-${param:EXT_INSTANCE_ID}/{document=**} {
      // Deny read and write operations
      allow read, write: if false;
    }
  }
}
```

## Try it out

Once processing is complete, a Callable function will be available to the user to use for queries. Queries are just a string that will be matched against all data in the Index.

Calling the function using the gcloud CLI:

```bash
curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $(gcloud auth print-access-token)" \
-d '{"data": {"query": ["..."]} }' \
https://${param:LOCATION}-${param:PROJECT_ID}.cloudfunctions.net/ext-${param:EXT_INSTANCE_ID}-queryIndex
```

Sample request body:

Image data is base64 encoded.

```json
{
  "data": {
    "query": ["iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAY..."]
  }
}
```

Sample response:

```json
{
  "nearestNeighbors": [
    {
      "id": "0",
      "neighbors": [
        {
          "datapoint": {
            "datapointId": "image1.png",
            "crowdingTag": {
              "crowdingAttribute": "0"
            }
          },
          "distance": 0.40997931361198425
        },
        {
          "datapoint": {
            "datapointId": "image2.png",
            "crowdingTag": {
              "crowdingAttribute": "0"
            }
          },
          "distance": 0.36510562896728516
        },
        ...
      ]
    }
  ]
}

```

The response contains object paths to images in the `${param:IMG_BUCKET}` bucket which you declared while setting up the extension. The app should retrieve the actual objects using a client SDK. This ensures that the extension respects your bucket’s security rules.

## Example client integration

Now that you have an index with data in it, you can run reverse image search search queries directly from your client application. Note that this Callable Function is protected by App Check and requires that you are signed in with a [Firebase Auth](https://firebase.google.com/docs/auth) user to call the Function from your client application. You can also use the `signInAnonymously` Auth SDK method if you do not want to enforce that users actually create their own accounts in Firebase Auth.

```js
import firebase from "firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const search = httpsCallable(functions, `ext-${param:EXT_INSTANCE_ID}-queryIndex`);

// run search
await search({ query: searchQuery })
  .then(async (result) => {
    // get results
    const { nearestNeighbours } = result.data;
    const paths  = nearestNeighbours.neighbours.map($ => $.datapoint.datapointId);

    // do something with the paths...
});
```

### Error Handling

If there are any errors during the query process, the extension will log the error message in the Cloud Functions logs. Make sure to monitor these logs and handle any errors appropriately in your application.

## Uninstalling the Extension

The extension does not delete or undeploy the Matching Engine Index automatically when you uninstall the extension. Vertex AI charges by node hour when hosting a Matching Engine Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available [here](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public#undeploy-index).

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
