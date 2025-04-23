## Complete your installation

Make sure you enabled data **read & write access in Cloud Audit Log** for Vertex AI API. The instructions to enable are as follows:

- [Visit this page](https://console.cloud.google.com/iam-admin/audit?cloudshell=false) and ensure that you have selected the project you'd like to install this extension in, using the project picker.
- Filter for "Vertex AI API" and click on the checkbox next to it. A new panel should appear on the right side of the page.
- On the new panel, click on the checkboxes next to "Data Read" and "Data Write", and click Save.

## Try it out

Once processing is complete, a Callable function will be available to the user to use for queries. Queries are just a string that will be matched against all data in the Index.

## Example client integration

Now that you have an index with data in it, you can run reverse image search queries directly from your client application. Note that this Callable Function requires that you are signed in with a [Firebase Auth](https://firebase.google.com/docs/auth) user to call the Function from your client application. You can also use the `signInAnonymously` Auth SDK method if you do not want to enforce that users actually create their own accounts in Firebase Auth.

```js
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase project configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Firebase Auth credentials
const email = "user@example.com";
const password = "password";

// Query payload
const queryData = {
  query: [
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // base64 encoded image
  ],
};

// Main function to authenticate and call Firebase extension
async function callFunction() {
  try {
    console.log("Initializing Firebase...");
    const app = initializeApp(firebaseConfig);

    console.log("Authenticating user...");
    const auth = getAuth(app);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log(`✅ Logged in as: ${userCredential.user.email}`);

    console.log("Getting Cloud Function reference...");
    const functions = getFunctions(app);
    const search = httpsCallable(functions, `ext-${param:EXT_INSTANCE_ID}-queryIndex`);

    console.log("Calling the search function with query data...");
    const result = await search(queryData);
    const { nearestNeighbors } = result.data.data;

    console.log("✅ Function call successful.");
    console.log("🔍 Nearest Neighbors Result:\n");

    nearestNeighbors.forEach((entry, i) => {
      console.log(`Result #${i + 1} - Query ID: ${entry.id}`);
      entry.neighbors.forEach((neighbor, j) => {
        const { datapointId } = neighbor.datapoint;
        const distance = neighbor.distance.toFixed(2);
        console.log(`  [${j + 1}] ${datapointId} (distance: ${distance})`);
      });
    });
  } catch (error) {
    console.error("❌ Error calling function:", error.message || error);
  }
}

callFunction();
```

Sample response format:

```json
{
  "data": {
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
          }
        ]
      }
    ]
  }
}
```

The response contains object paths to images in the `${param:IMG_BUCKET}` bucket which you declared while setting up the extension. The app should retrieve the actual objects using a client SDK. This ensures that the extension respects your bucket's security rules.

### Error Handling

If there are any errors during the query process, the extension will log the error message in the Cloud Functions logs. Make sure to monitor these logs and handle any errors appropriately in your application.

## Uninstalling the Extension

The extension does not delete or undeploy the Matching Engine Index automatically when you uninstall the extension. Vertex AI charges by node hour when hosting a Matching Engine Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available [here](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public#undeploy-index).

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.