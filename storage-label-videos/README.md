# Label Videos with Cloud Video AI

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Extracts labels from videos and saves to Cloud Storage using Cloud Video Intelligence API.

**Details**: ## How This Extension Works

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

**Configuration Parameters:**

- Cloud Functions location: Cloud region where annotation should take place. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

- Cloud Storage bucket where videos should be picked up and processed.: Cloud Storage bucket where videos should be picked up and processed.

- Cloud Storage bucket where the ouput json from a processed videos should be stored.: Cloud Storage bucket where videos should be process to.

- Input videos path: A Storage path in the input video bucket that the extension should process videos from.

- Output videos path: A Storage path in the output video bucket that the output json should be stored.

- Label detection mode: What labels should be detected with LABEL_DETECTION, in addition to video-level labels or segment-level labels. If unspecified, defaults to SHOT_MODE.

- Video confidence threshold: The confidence threshold we perform filtering on the labels from video-level and shot-level detections. If not set, it is set to 0.3 by default. The valid range for this threshold is [0.1, 0.9]. Any value set outside of this range will be clipped. Note: for best results please follow the default threshold. We will update the default threshold everytime when we release a new model.

- Frame confidence threshold: The confidence threshold we perform filtering on the labels from frame-level detection. If not set, it is set to 0.4 by default. The valid range for this threshold is [0.1, 0.9]. Any value set outside of this range will be clipped. Note: for best results please follow the default threshold. We will update the default threshold everytime when we release a new model.

- Model: Model to use for label detection.

- Stationary Camera: Whether the video has been shot from a stationary (i.e. non-moving) camera. When set to true this might improve detection accuracy for moving objects. Will default to false if LABEL_DETECTION_MODE has been set to SHOT_AND_FRAME_MODE.

**Cloud Functions:**

- **labelVideo:** Listens to incoming Storage documents that are videos and executes video labelling detection on them.

**APIs Used**:

- videointelligence.googleapis.com (Reason: Powers all Video Intelligence tasks performed by the extension.)

**Access Required**:

This extension will operate with the following project IAM roles:

- storage.objectAdmin (Reason: Allows the extension to write to your Cloud Storage.)
