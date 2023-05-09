# PaLM Secure Backend

**Author**: undefined 

**Description**: Use Firestore to create discussions with Google AI's Generative Language API.



**Details**: 
# How this extension works

This extension creates callable functions which allow authorized calls to the PaLM API.

Three callable functions are provided:

- `getModels` takes no arguments and will respond with detailed information about all models on the PaLM API

- `getModel` takes an object `{name: string}` as an argument and will return information about a specific model.

- `post` takes an object as an argument. The object must have properties `{model: string, method: string}`. It will make a `POST` request to the PaLM API. Any other properties of the object will be used to populate the body of this request. 


## Additional setup

Before installing this extension, make sure that you've [enabled the Generative Language API](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) in your Google Cloud Project.
## Billing
To install an extension, your project must be on the Blaze (pay as you go) plan
You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:

- Cloud Firestore
- Cloud Functions
- Google Generative Language API

[Learn more about Firebase billing.](https://firebase.google.com/pricing)



**Configuration Parameters:**

* Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* API Key: Google Cloud API Key with PaLM API access enabled.



**Cloud Functions:**

* **post:** https endpoint wrapping the PaLM API

* **getModels:** https endpoint wrapping the PaLM API

* **getModel:** https endpoint wrapping the PaLM API



**APIs Used**:

* generativelanguage.googleapis.com (Reason: test)
