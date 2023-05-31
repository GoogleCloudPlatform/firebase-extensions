# Transcode Videos on Google Cloud Storage

**Author**: Firebase (**[https://firebase.google.com](https://firebase.google.com)**)

**Description**: Transcode video files into formats suitable for consumer distribution.



**Details**: # Templates

By default the extension suggests using [preset/web-hd](https://cloud.google.com/transcoder/docs/concepts/overview#job_template) for transcoding.

Custom templates can be created [here](https://cloud.google.com/transcoder/docs/how-to/job-templates).




**Configuration Parameters:**

* Cloud Functions location: Cloud region where transcoding should take place. For help selecting a location, refer to the [location selection guide](https://firebase.google.com/docs/functions/locations).


* Cloud Storage bucket where videos should be picked up and processed.: Cloud Storage bucket where videos should be picked up and processed.


* Cloud Storage bucket where processed videos should be output to.: A Storage bucket that the extension should process videos to.


* Input videos path: A Storage path in the input video bucket that the extension should process videos from.


* Output videos path: A Storage path in the output video bucket that the processed videos should be output to.


* The default transcoding template ID to use for transcoding jobs.: A template id for populating a job configuration.




**Cloud Functions:**

* **transcodevideo:** Listens to incoming Storage documents that are videos and executes a video transcoding job on them.



**APIs Used**:

* transcoder.googleapis.com (Reason: Powers all Video Transcoding tasks performed by the extension.)



**Access Required**:



This extension will operate with the following project IAM roles:

* transcoder.admin (Reason: Allows the extension to create video transcoding jobs.)

* storage.admin (Reason: Allows the extension to write to your Cloud Storage.)
