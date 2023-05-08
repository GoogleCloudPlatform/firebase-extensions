# Label Videos with Video Intelligence API

**Author**: Google Cloud (**[https://cloud.google.com/](https://cloud.google.com/)**)

**Description**: Extracts labels from videos and saves to Cloud Storage using Cloud Video API.



**Details**: This extension will automatically annotate media from the specified `input` storage bucket and path.  This will output a `.json` file with the resulting annotations into the specified `output` storage bucket and path.

# Billing

This extension uses other Firebase or Google Cloud Platform services which may have associated charges:

<!-- List all products the extension interacts with -->

- Cloud Functions
- Cloud Video Intelligence API
- Cloud Storage

When you use Firebase Extensions, you're only charged for the underlying resources that you use. A paid-tier (Blaze) billing plan is required because the extension uses Cloud Video Intelligence API.



**Configuration Parameters:**

* Cloud Functions location: Cloud region where annotation should take place. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).

* Cloud Storage bucket where videos should be picked up and processed.: Cloud Storage bucket where videos should be picked up and processed.


* Cloud Storage bucket where the ouput json from a processed videos should be stored.: Cloud Storage bucket where videos should be process to.


* Input videos path: A Storage path in the input video bucket that the extension should process videos from.


* Output videos path: A Storage path in the output video bucket that the output json should be stored.


* Label detection mode: What labels should be detected with LABEL_DETECTION, in addition to video-level labels or segment-level labels. If unspecified, defaults to SHOT_MODE.


* Video confidence threshold: The confidence threshold we perform filtering on the labels from video-level and shot-level detections. If not set, it is set to 0.3 by default. The valid range for this threshold is [0.1, 0.9]. Any value set outside of this range will be clipped. Note: for best results please follow the default threshold. We will update the default threshold everytime when we release a new model.


* Frame confidence threshold: The confidence threshold we perform filtering on the labels from frame-level detection. If not set, it is set to 0.4 by default. The valid range for this threshold is [0.1, 0.9]. Any value set outside of this range will be clipped. Note: for best results please follow the default threshold. We will update the default threshold everytime when we release a new model.


* Model: Model to use for label detection.


* Stationary Camera: Whether the video has been shot from a stationary (i.e. non-moving) camera. When set to true this might improve detection accuracy for moving objects. Will default to false if LABEL_DETECTION_MODE has been set to SHOT_AND_FRAME_MODE.




**Cloud Functions:**

* **labelVideo:** Listens to incoming Storage documents that are videos and executes video labelling detection on them.



**APIs Used**:

* videointelligence.googleapis.com (Reason: Powers all Video Intelligence tasks performed by the extension.)



**Access Required**:



This extension will operate with the following project IAM roles:

* storage.objectAdmin (Reason: Allows the extension to write to your Cloud Storage.)
