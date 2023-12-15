# Semantic Search with Vertex AI

**Author**: Firebase (**[https://firebase.google.com](https://firebase.google.com)**)

**Description**: Search for semantically similar text documents in Firestore with PaLM API and Vertex AI Matching Engine.



**Details**: > ⚠️ The Vertex Matching Engine Public Endpoints feature and PaLM API are currently in public preview.
>
> For details and limitations, see the [Vertex AI documentation](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public) and [PaLM API documentation](https://developers.generativeai.google/guide/preview_faq).
>
> PaLM API is an optional feature of this extension. This extension uses the Vertex AI PaLM endpoint for embeddings.

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
> Vertex AI charges by node hour when hosting a Matching Engine Index, so your project will continue to incur costs until you manually undeploy the index. Instructions for undeploying an index are available [here](https://cloud.google.com/vertex-ai/docs/matching-engine/deploy-index-public#undeploy-index).
>
> You can [read more about Matching Engine pricing here](https://www.google.com/url?q=https://cloud.google.com/vertex-ai/pricing%23matchingengine&sa=D&source=docs&ust=1683194254385742&usg=AOvVaw1kYFVKa8gdagrau70Vzk6G).




**Configuration Parameters:**

* Collection to index: The Firestore collection to include in the search index.

* Fields in a Document to index: Comma-separated list of field names to include in the search index. If you leave this blank, all fields will be indexed.

* Do backfill?: Whether to backfill embeddings for all documents currently in the collection.

* Embeddings method: Do you want to use [PaLM](https://developers.generativeai.google/guide/palm_api_overview) for embeddings  or [Universal Sentence Encoder](https://tfhub.dev/google/universal-sentence-encoder/4)?

* PaLM embeddings model: In case you chose PaLM embeddings, which model do you want to use? Note that this will be ignored if you chose Universal Sentence Encoder.

* Distance measure type: The distance measure used in nearest neighbor search. The default is dot product.  [Read more about distance measures here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#distance-measure-type).

* Algorithm config: The configuration with regard to the algorithms used for efficient search. [Read more about algorithm config here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#tree-ah-config).

* Approximate number of neighbors: The approximate number of neighbors to return in the response. [Read more about this parameter here](https://cloud.google.com/vertex-ai/docs/matching-engine/configuring-indexes#nearest-neighbor-search-config).

* Shard size: The size of the shard, which correlates to the machine type used. [Read more about shards config here](https://cloud.google.com/vertex-ai/docs/matching-engine/create-manage-index#create-index).

* Machine type: The type of machine that is deployed for the index endpoint. [Read more about machine types config here](https://cloud.google.com/vertex-ai/docs/predictions/configure-compute#g2-series).

* Accelerator type: The accelerator type for the deployed index endpoint. [Read more about accelerator types config here](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/MachineSpec#AcceleratorType).

* Accelerator Count: The number of accelerators to attach to the the deployed index endpoint machine. [Read more about accelerator counts config here](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/MachineSpec).

* Min replica count: The minimum number of machine replicas for the deployed index endpoint. [Read more about min replica counts config here](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/DedicatedResources).

* Max replica count: The maximum number of machine replicas for the deployed index endpoint when the traffic against it increases. [Read more about max replica config here](https://cloud.google.com/vertex-ai/docs/reference/rest/v1/DedicatedResources).

* Cloud Functions location: Where do you want to deploy the functions created for this extension? For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).



**Cloud Functions:**

* **backfillTrigger:** Sets up the Vertex Matching Engine index and creates a private connection to it.

* **updateIndexConfig:** Updates the configuration of the Vertex Matching Engine index.

* **backfillTask:** A task-triggered function that gets called before a Vertex Matching Engine index is created. It backfills embeddings for all documents in the collection.

* **createIndexTrigger:** An event-triggered function that gets called when a special metadata document updated. It checks the status of the backfill every time, and once it's done it will trigger index creation.

* **streamUpdateDatapoint:** An event-triggered function that gets called when a document is created or updated. It generates embeddings for the document and updates the Matching Engine index.

* **streamRemoveDatapoint:** An event-triggered function that gets called when a document is deleted. It deleted the document's datapoint from the Matching Engine index.

* **datapointWriteTask:** A task-triggered function that gets scheduled when a new write operation is detected but the index isn't ready. It generates embeddings for the document and updates the Matching Engine index.

* **queryIndex:** A function that queries the Vertex Matching Engine index.



**Other Resources**:

* onIndexCreated (firebaseextensions.v1beta.v2function)

* onIndexDeployed (firebaseextensions.v1beta.v2function)



**APIs Used**:

* aiplatform.googleapis.com (Reason: Powers Vertex Matching Engine)

* eventarc.googleapis.com (Reason: Powers all events and triggers)

* run.googleapis.com (Reason: Powers v2 Cloud Functions)

* storage-component.googleapis.com (Reason: Needed to use Cloud Storage)



**Access Required**:



This extension will operate with the following project IAM roles:

* datastore.user (Reason: This extension requires read/write access to Firestore.)

* storage.admin (Reason: This extension requires write access to Cloud Storage to create a bucket and upload embeddings files to it as part of the backfill.)

* aiplatform.user (Reason: This extension requires access to Vertex AI to create, update and query a Vertex Matching Engine index.)
