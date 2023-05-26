> ⚠️ The PaLM API is currently in public preview. For details and limitations, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).
> **Please ensure that you have already signed up for the [waitlist](https://makersuite.google.com/waitlist) and have been approved before installing the extension.**

This extension allows you to summarize a field in a Firestore document using the PaLM API.

On installation, you will need to specify the following information:

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

### Regenerating a response

Changing the state field of a completed document's status from `COMPLETED` to anything else will retrigger the extension for that document.

## Additional Setup

If you have not already done so, you will first need to apply for access to the PaLM API via this [waitlist](https://makersuite.google.com/waitlist).

Once you have access, please [enable the Generative Language API in your Google Cloud Project](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) before installing this extension.

Ensure you have a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [Cloud Storage bucket](https://firebase.google.com/docs/storage) set up in your Firebase project, and enabled the Generative Language API in your Google Cloud Project before installing this extension.

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service’s no-cost tier:

- Cloud Firestore
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing.](https://firebase.google.com/pricing)

Additionally, this extension uses the PaLM API, which is currently in public preview. During the preview period, developers can try the PaLM API at no cost. Pricing will be announced closer to general availability. For more information on the PaLM API public preview, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).
