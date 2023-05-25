# Call PaLM API Securely

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Protects your API key and prevents resource abuse by deploying a backend to call the PaLM API, secured by App Check.

**Details**: > ⚠️ The PaLM API is currently in public preview. For details and limitations, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).

> **Please ensure that you have already signed up for the [waitlist](https://makersuite.google.com/waitlist) and have been approved before installing the extension.**

This extension helps you call the PaLM API from your frontend client application without exposing your API key directly in the frontend code.

The extension provides API endpoints optionally secured by App Check that you can use to call PaLM from your Firebase app. The deployed endpoint is a thin wrapper, so you can send the same request body as you would use when directly calling the PaLM Text API. The API key is stored as a secret in Cloud Secret Manager and can be directly accessed by the API endpoint deployed by the extension, so it does not need to be provided in the request. These API endpoints are deployed as [Firebase Callable Functions](https://firebase.google.com/docs/functions/callable), and require that you are signed in with a [Firebase Auth](https://firebase.google.com/docs/auth) user to successfully call the Functions from your client application.

The extension also allows you to configure App Check on the deployed Callable Functions, which can help you prevent unauthorized clients from accessing the Functions deployed by this extension. If you configure the extension to use App Check, you will need to follow [these instructions](https://firebase.google.com/docs/app-check) to also enable App Check in your Firebase app.

Three Callable Functions are provided:

- getModels takes no arguments and will respond with detailed information about all models on the PaLM API
- getModel takes an object {name: string} as an argument and will return information about a specific model.
- post takes an object as an argument. The object must have properties {model: string, method: string}. It will make a POST request to the PaLM API. Any other properties of the object will be used to populate the body of this request.

## Additional Setup

If you have not already done so, you will first need to apply for access to the PaLM API via this [waitlist](https://makersuite.google.com/waitlist).

To use this extension, you will need to generate an API key from [MakerSuite](http://makersuite.google.com/?db=palm). Go to the API Access page and click the "Generate an API key" button. The extension will ask for that API key during the installation process.

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:

- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing.](https://firebase.google.com/pricing)

Additionally, this extension uses the PaLM API, which is currently in public preview. During the preview period, developers can try the PaLM API at no cost. Pricing will be announced closer to general availability. For more information on the PaLM API public preview, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).

**Configuration Parameters:**

- Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

- API Key: Google Cloud API Key with PaLM API access enabled.

- Enforce App Check: If enabled, App check will be enforced for function calls.

**Cloud Functions:**

- **post:** https endpoint wrapping the PaLM API

- **getModels:** https endpoint wrapping the PaLM API

- **getModel:** https endpoint wrapping the PaLM API
