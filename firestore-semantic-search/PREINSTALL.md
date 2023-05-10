> ⚠️ The Vertex Matching Engine Public Endpoints feature and PaLM API are currently in public preview. 
> 
> For details and limitations, see the [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public) and [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq). 
> 
> PaLM API is an optional feature of this extension.

This extension adds text similarity search to your Firestore application using Vertex AI’s [Matching Engine](https://cloud.google.com/vertex-ai/docs/matching-engine/overview). Text similarity search relies on first generating embeddings (vector representations of your original text) which are stored in a Matching Engine index. Once these embeddings are indexed, the Matching Engine can be used to calculate semantically similar documents to an original document from a large corpus of candidate documents, based on vector distance measures.

On installation, you will need to specify a Firestore collection path to index and the document fields to index.

Once installed, the extension does the following:
1. Automatically generates and stores embeddings in Vertex AI whenever documents are created, updated, or deleted in target collection(s)
2. Provides a secure API endpoint to query similar documents (given an input document) that can be used by client applications
3. (Optional) Backfills existing data from target collection(s)

The query API endpoint is deployed as a Firebase Callable Function, and requires that you are signed in with a Firebase Auth user to successfully call the Function from your client application.

### Embeddings models

The extension currently provides three options for generating text embeddings: [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4) (USE) from TensorFlow Hub, the [PaLM Text Embeddings API](https://developers.generativeai.google/tutorials/embed_node_quickstart) (models/embedding-gecko-001), or any [GraphDev-based TF JS model](https://www.tensorflow.org/js/tutorials/conversion/import_saved_model) in a GCS bucket. 

There are several important differences, so make sure you pick an option which suits your use-case:
- Speed: currently the PaLM endpoint does not allow batch processing, so the backfill process will take longer. Choose the USE model if you would like the extension to run on a pre-existing collection with many documents (>10K) already.
- Dimensions: the PaLM model embeds to a space of dimension 768, whereas the USE model embeds to a space of 512. Larger dimension indexes will cost more on Vertex AI but also can capture more features.
- Memory: models from TensorFlow Hub will be loaded into Function memory, whereas PaLM provides an API. Large models may require you to increase the memory from the default (512MB), which can incur additional Functions costs.

## Additional Setup

### Cloud Audit Log access

First, before installing the extension, you need to enable data read & write access in Cloud Audit Log for Vertex AI API. The instructions to enable are as follows:
- [Visit this page](https://console.cloud.google.com/iam-admin/audit?cloudshell=false) and ensure that you have selected the project you’d like to install this extension in, using the project picker.
- Filter for “Vertex AI API” and click on the checkbox next to it. A new panel should appear on the right side of the page.
- On the new panel, click on the checkboxes next to “Data Read” and “Data Write”, and click Save.

### PaLM API access (optional)

If you would like to use the PaLM embeddings model, you will first need to apply for access to the PaLM API via this [waitlist](https://makersuite.google.com/waitlist). 

Once you have access, please [enable the Generative Language API in your Google Cloud Project](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) before installing this extension.

### Cloud Firestore and Cloud Storage setup

Make sure that you've set up a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [enabled Cloud Storage](https://firebase.google.com/docs/storage) in your Firebase project.

After installation, you will need to also add some security rules on a new Firestore collection created by the extension that is used to store internal backfill state. Please check the extension instance after installation for more details.

### Installation time

Note that the extension itself will take **~2h** to finish installing & processing, with a minimum of 40 minutes to create the Index, 60 mins to deploy the Index, and the rest of time to backfill existing data (optional). The total runtime will depend on how large your existing dataset is.

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan. You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).
This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:
- Cloud Firestore
- Cloud Storage
- Cloud Run
- Cloud EventArc
- [Vertex AI](https://cloud.google.com/vertex-ai/pricing#matchingengine)
- Cloud Functions (See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))

[Learn more about Firebase billing](https://firebase.google.com/pricing).

Additionally, this extension uses the PaLM API, which is currently in public preview. During the preview period, developers can try the PaLM API at no cost. Pricing will be announced closer to general availability. For more information on the PaLM API public preview, see the [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).

> :warning: Note: The extension does not delete the Matching Engine Index automatically when you uninstall the extension. 
> 
> Vertex AI charges by node hour when hosting a Matching Engine Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available here.
>
> You can [read more about Matching Engine pricing here](https://www.google.com/url?q=https://cloud.google.com/vertex-ai/pricing%23matchingengine&sa=D&source=docs&ust=1683194254385742&usg=AOvVaw1kYFVKa8gdagrau70Vzk6G).
