> ⚠️ The PaLM API is currently in public preview. For details and limitations, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).
> **Please ensure that you have already signed up for the [waitlist](https://makersuite.google.com/waitlist) and have been approved before installing the extension.**

This extension allows you to perform language tasks using the PaLM API, a custom prompt, and Firestore.

On installation, you will be asked to provide the following information:

- **Prompt:** This is the text that you want the PaLM API to generate a response for. It can be free-form text or it can use handlebars variables to substitute values from the Firestore document.
- **Firestore collection path:** This is the path to the Firestore collection that contains the documents that you want to perform the language task on.
- **Response field:** This is the name of the field in the Firestore document where you want the extension to store the response from the PaLM API.

This extension will listen to the specified collection for new documents. When such a document is added, the extension will:

1. Substitute any variables from the document into the prompt.
2. Query the PaLM API to generate a response based on the prompt.
3. Write the response from the PaLM API back to the triggering document in the response field.

Each instance of the extension should be configured to perform one particular task. If you have multiple tasks, you can install multiple instances.

For example, you could use this extension to:

- Predict star ratings on a collection of product reviews.
- Classify customer feedback as positive, negative, or neutral.
- Summarize long articles.
- Extract named entities from text.
- Generate creative text, such as poems or code.

Here’s an example prompt used for predicting star ratings on a collection of product reviews:

```
Provide a star rating from 1-5 of the following review text: “This is a truly incredible water bottle, I keep it with me all the time when I’m traveling and it has never let me down.”
5

Provide a star rating from 1-5 of the following review text: “I really enjoyed the water bottle, I just wish they carried this in a larger size as I go for long hikes. But overall the aesthetic, manufacturing, and functional design are great for what I needed.”
4

Provide a star rating from 1-5 of the following review text: “The water bottle was fine, although the design was a bit lacking and could be improved.”
3

Provide a star rating from 1-5 of the following review text: “Please don’t get this water bottle, there are major design flaws, for example the cap doesn’t screw on fully so water leaks into my backpack all the time.”
1

Provide a star rating from 1-5 of the following review text: \“{{review_text}}\”
```

In this case, review_text is a field of the Firestore document and will be substituted into the prompt when querying PaLM.

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
