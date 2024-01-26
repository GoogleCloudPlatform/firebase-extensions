## See It In Action

You can call the function using a client SDK. For example, with the Node v9 syntax:

```javascript
const firebaseConfig = {...};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// authenticating in with email and password, for example
// signInAnonymously is another option if you don't want to enforce account creation
await signInWithEmailAndPassword(auth,"test@example.com","password");

const functions = getFunctions(app,"${param:LOCATION}");

const getModels = httpsCallable(functions,"ext-${param:EXT_INSTANCE_ID}-getModels")
const models = await getModels();

const getModel = httpsCallable(functions, 'ext-${param:EXT_INSTANCE_ID}-getModel');
const chatBison = await getModel({name: "chat-bison-001"});

const post = httpsCallable(functions, 'ext-${param:EXT_INSTANCE_ID}-post');

/** Data does not need to be restructured or could be { data } **/
const response = await post({
    model: "text-bison-001",
    method: "generateText",
    prompt: {
        text: "Hello there!"
    }
})
```

## Custom Hook

If you have set the Custom Hook URL parameter at install, each time the extension calls the PaLM API it will forward on the request data, response data, and the auth context to the URL you provided, to do with as you wish.

## Code Samples

You can find code samples of frontend applications that use this extension [here](https://github.com/google/generative-ai-docs/tree/main/demos/palm/web/quick-prompt) and [here](https://github.com/google/generative-ai-docs/tree/main/demos/palm/web/list-it).

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
