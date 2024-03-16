# How to use this extension
## Embedding documents

1.  Go to your [Cloud Firestore dashboard](https://console.firebase.google.com/project/${param:PROJECT_ID}/firestore/data) in the Firebase console.

2.  If it doesn't exist already, create a collection called `${param:COLLECTION_NAME}`.

3.  Create a document with a field named `${param:INPUT_FIELD_NAME}`, and add text you would like to embed.

4.  In a few seconds, you'll see a new field called `${param:OUTPUT_FIELD_NAME}` pop up in the same document you just created. It will contain the embedding for the text in `${param:INPUT_FIELD_NAME}`

## Querying the index

*Important: Before you will be able to query the collection, firestore will have to build a vector index. This extension will trigger the basic index (no prefilters) upon installation or reconfiguration.

You can check the build status of indexes here:

https://console.firebase.google.com/project/${param:PROJECT_ID}/firestore/indexes


Where you have replaced `<DIMENSION>` with the dimension of the embedding space you are using, e.g 768 for Gemini.

Once the index is created, you may query it either through a callable cloud function deployed by the extension:

```
gcloud functions --project ${param:PROJECT_ID} call ext-${param:EXT_INSTANCE_ID}-queryCallable --data '{"data": {"query":"foo bar"}}'
```

Or by adding a document to the collection `_${param:EXT_INSTANCE_ID}/index/queries` with a `query` field and an (optional) limit field.

### Prefilters

The callable function deployed by this extension supports prefiltering on queries.

A sample callable function argument is as follows:

```
{
    query: "my query",
    limit: 4,
    prefilters: [
        {
            field: "age",
            operator: "==",
            value: 30
        }
    ]
}
```

It is important to note that such a query will require a composite index. The first call you make to the function will fail, and a `gcloud` CLI command will be logged which will trigger the build of an appropriate index.

## Setting up a custom embedding function

This extension may be configured to use embedding models other than Gemini and OpenAI. To use this feature you must specify additional configuration parameters:

- Custom embedding endpoint: This is the endpoint of some http function which should accept a POST request with sample body shape:

```
{
    "batch": ["sample text 1","sample text 2", "sample text 3"]
}
```

It must return a response with body of type
```
{
    embeddings: number[][]
}
```

- Custom embedding dimension: This is the dimension of your custom embedding

- Custom embedding batch size: The


## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
