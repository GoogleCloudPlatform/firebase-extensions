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
const {response} = await post({
    model: "text-bison-001",
    method: "generateText",
    prompt: {
        text: "Hello there!"
    }
})
```

## Code Samples

You can find code samples of frontend applications that use this extension [here](https://github.com/googlecreativelab/quickprompt) and [here](https://github.com/googlecreativelab/listit).

## Monitoring

As a best practice, you can [monitor the activity](https://firebase.google.com/docs/extensions/manage-installed-extensions#monitor) of your installed extension, including checks on its health, usage, and logs.
