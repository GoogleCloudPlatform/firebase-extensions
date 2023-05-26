# Chatbot with PaLM API

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Deploys customizable chatbots using PaLM API and Firestore.



**Details**: > ⚠️ The PaLM API is currently in public preview. For details and limitations, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).
> **Please ensure that you have already signed up for the [waitlist](https://makersuite.google.com/waitlist) and have been approved before installing the extension.**

Use this extension to easily deploy a chatbot using the PaLM API, stored and managed by Cloud Firestore.

On install you will be asked to provide a Firestore collection path, used to store conversation history represented as documents. This extension will listen to the specified collection(s) for new message documents.

The collection path also supports wildcards, so you can trigger the extension on multiple collections, each with their own private conversation history. This is useful if you want to create separate conversations for different users, or support multiple chat sessions.

Message documents might look like this:

```
{
  prompt: “What is the best museum to visit in Barcelona, Spain?”
}
```

When a message document is added, the extension will:

- Obtain conversation history by sorting the documents of the collection.
- Query the language model you selected during configuration.
- Write the message back to the triggering document in a configurable response field.

A createTime field will be automatically created for you on document creation, and will be used to order the conversation history. PaLM has a limited context window, so only the most recent messages will be used as history to generate the next response. Alternatively, If documents in the specified collection already contain a field representing timestamps, you can use that as the order field instead.

You can configure the chatbot to return different responses by providing context during installation. For example, if you want the chatbot to act as a travel guide, you might use this as the context:

```
I want you to act as a travel guide. I will ask you questions about various travel destinations, and you will describe those destinations and give me suggestions on places to visit.
```

You can also configure the model to return different results by tweaking model parameters (temperature, candidate count, etc.), which are exposed as configuration during install as well.

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




**Configuration Parameters:**

* Collection Path: Path to a Cloud Firestore collection which will represent a discussion with a LLM on the PaLM API.

* Prompt Field: The field in the message document that contains the prompt.

* Response Field: The field in the message document into which to put the response.

* Order Field: The field by which to order when fetching conversation history. If absent when processing begins, the current timestamp will be written to this field. Sorting will be in descending order.

* Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Language model: Which language model do you want to use?

* Context: Contextual preamble for the language model. A string giving context for the discussion.

* Temperature: Controls the randomness of the output. Values can range over [0,1], inclusive. A value closer to 1 will produce responses that are more varied, while a value closer to 0 will typically result in less surprising responses from the model.

* Nucleus sampling probability: If specified, nucleus sampling will be used as the decoding strategy. Nucleus sampling considers the smallest set of tokens whose probability sum is at least a fixed value. Enter a value between 0 and 1.

* Sampling strategy parameter: If specified, top-k sampling will be used as the decoding strategy. Top-k sampling considers the set of topK most probable tokens.

* Candidate count: The default value is one. When set to an integer higher than one, additional candidate responses, up to the specified number, will be stored in Firestore under the 'candidates' field.

* Candidates field: The field in the message document into which to put the other candidate responses if the candidate count parameter is greater than one.

* Enable per document overrides.: If set to \"Yes\", discussion parameters may be overwritten by fields in the discussion collection.



**Cloud Functions:**

* **generateMessage:** Listens to Firestore data writes to generate conversations.



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: Allows this extension to access Cloud Firestore to read and process added messages.)
