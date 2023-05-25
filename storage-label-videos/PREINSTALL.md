## How This Extension Works

This extension extracts labels from media files stored in Cloud Storage and writes them as JSON files back to Cloud Storage. Supported media formats are listed [here](https://cloud.google.com/video-intelligence/docs/supported-formats).

On installation, you will be asked to provide an input and output Storage path. This extension triggers a Cloud Function whenever a new video file is uploaded to the specified bucket. The Cloud Function calls the Video Intelligence API to extract labels and writes the output as a JSON file in the output Storage path. The output filename will match the input filename (with file extensions changed).

### Use Cases

Extracting labels from videos can help with:

- Content moderation for user-generated video platforms
- Video search and recommendations based on detected objects or activities
- Surveillance and security applications for detecting anomalies
- Retail analytics, such as customer behavior analysis and product placement optimization
- Assisting visually impaired users by providing descriptions of video content

## Additional Setup

Ensure you have a [Cloud Storage bucket](https://firebase.google.com/docs/storage) set up in your Firebase project.

## Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

- [Video Intelligence API](https://cloud.google.com/video-intelligence#section-10)
- Cloud Storage
- Cloud Functions (Node.js 14+ runtime. See [FAQs](https://firebase.google.com/support/faq#extensions-pricing))\* Cloud Vision API

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier (Blaze) billing plan is required because the extension uses Cloud Vision API.
