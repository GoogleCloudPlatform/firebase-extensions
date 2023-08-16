# Summarize Text with PaLM API

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Summarizes text in Firestore documents using PaLM API.



**Details**: This extension allows you to summarize a field in a Firestore document using the PaLM API.

On installation, you will need to specify the following information:

- **PaLM API Provider** This extension makes use of the PaLM large language model. There is a choice of provider for this API. See the section below for more details.
- **Firestore collection path:** The path to the Firestore collection that contains the documents to summarize.
- **Document field to summarize:** The name of the document field to summarize.
- **Target summary length (number of sentences):** The desired length of the summary in sentences.
- **Response field:** The name of the field in the document to store the summary.

This extension will listen to the specified collection for new document writes and execute the following logic:

1. Call the PaLM API to generate a summary of the document field.
2. Write the summary back to the triggering document in the response field.

### Use cases

This extension can be used for a variety of use cases, including:

- Summarizing customer feedback
- Abstracting long articles
- Condensing user-generated content

Here are some examples of how this extension can be used:

- An e-commerce platform could use this extension to automatically generate summaries of customer feedback, giving customers a quick overview of the feedback before they decide whether to read the full content.
- A news website could use this extension to summarize articles, helping readers decide whether they want to invest their time in reading the full article.
- A social media platform could use this extension to provide summaries of user-generated content, improving content discoverability and user engagement.

### Choosing a PaLM Provider

There are currently two different APIs providing access to PaLM large language models. The PaLM Developer (Generative Language) API, and Vertex AI. This extension will prompt you to pick an API on installation. For production use-cases we recommend Vertex AI, as the Generative Language API is still in public preview.

- The PaLM developer (Generative Language) API is currently in public preview, and you will need to sign up [waitlist](https://makersuite.google.com/waitlist) if you want to use it. For details and limitations, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).

- For more details on the Vertex AI PaLM API, see the [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview)

### Regenerating a response

Changing the state field of a completed document's status from `COMPLETED` to anything else will retrigger the extension for that document.

## Additional Setup

If you have not already done so, you will first need to apply for access to the PaLM API via this [waitlist](https://makersuite.google.com/waitlist).

Once you have access, please [enable the Generative Language API in your Google Cloud Project](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) before installing this extension.

Ensure you have a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) set up in your Firebase project, and enabled the Generative Language API in your Google Cloud Project before installing this extension.

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:

- Cloud Firestore
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing.](https://firebase.google.com/pricing)

Additionally, this extension uses the PaLM API, which is currently in public preview. During the preview period, developers can try the PaLM API at no cost. Pricing will be announced closer to general availability. For more information on the PaLM API public preview, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).




**Configuration Parameters:**

* Palm API Provider: There are two services which provide access to the PaLM API. Which would you like to use? If Vertex AI is selected, the service will be automatically enabled. If Generative Language is selected, you can provide an API key obtained through MakerSuite or your GCP console, or use Application Default Credentials if the Generative Language AI is enabled in your google cloud project.

* API Key (Generative Language AI for Developers Provider ONLY): If you selected Generative AI for Developers as your PaLM API provider, you can optionally choose to provide an API key. If you do not provide an API key, the extension will use Application Default Credentials, but will need the service enabled in GCP.

* Collection Name: Path to the Firestore collection where messages will be generated.

* Text field: The field of the document containing text to summarize.

* Response Field: The field in the message document into which to put the response.

* Target Summary Length: Number of sentences you would like the summary to be.

* Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).



**Cloud Functions:**

* **generateSummary:** Listens to Firestore data writes to generate summaries.



**APIs Used**:

* aiplatform.googleapis.com (Reason: For access to the PaLM API if the Vertex AI PaLM provider is chosen.)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows this extension to access Cloud Firestore to read and process added text.)

* aiplatform.user (Reason: Allows this extension to access the PaLM API via Vertex AI if this provider is chosen.)
