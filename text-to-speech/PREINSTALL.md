This extension converts text from Firestore documents into speech using the Google Cloud Text-to-Speech API.

Upon install you will be asked to provide a Firestore collection path and a Storage path. Any document writes to this collection will trigger a Cloud Function that does the following:
t
* Generates an audio version of the same text
* Stores it in Cloud Storage in the specified path
* Writes the path to the Storage object back in the same document.

## Use Cases
* **Accessibility**: A key strength of TTS lies in fostering inclusive access to digital content for people with visual impairments or who face reading challenges. By utilizing TTS, we can work towards providing equal opportunities for everyone to obtain information, acknowledging and embracing the diverse abilities and requirements of all users.
* **Language learning**: TTS can be a handy tool for language learners, as it can help users to practice their pronunciation and improve their listening comprehension. By providing accurate and natural-sounding speech, TTS can help language learners to develop their language skills in a more immersive and interactive way.
* **Navigation**: In-car navigation systems often use TTS to give drivers turn-by-turn directions. TTS can help drivers keep their eyes on the road and avoid distractions by providing spoken instructions, improving safety.
* **Virtual assistants**: Virtual assistants like Siri, Alexa, and Google Assistant rely heavily on TTS to provide users with helpful information and complete tasks. Using TTS, virtual assistants can create a more natural and conversational experience for users, enhancing their overall usability.

## Additional Setup

Before installing this extension, make sure that you've set up a [Cloud Firestore database](https://firebase.google.com/docs/firestore/quickstart) and [Cloud Storage bucket](https://firebase.google.com/docs/storage) in your Firebase project.

Keep in mind that not all SSML genders and voice types are supported for every language. The Text to Speech API documentation gives a comprehensive list of [supported voices and languages](https://cloud.google.com/text-to-speech/docs/voices).

## Billing

To install an extension, your project must be on the Blaze (pay as you go) plan.

You will be charged a small amount (typically around $0.01/month) for the Firebase resources required by this extension (even if it is not used).

This extension uses other Firebase and Google Cloud Platform services, which have associated charges if you exceed the service's no-cost tier:

* [Google Cloud Text-to-Speech API](https://cloud.google.com/text-to-speech#section-11)
* Cloud Firestore
* Cloud Storage
* Cloud Functions (Node.js 14+ runtime. See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))
