## Version 0.1.6

- Truncate requests sent to API to fix bug for long conversations.
- Bump dependencies for PaLM APIs
## Version 0.1.5

- Removed unnecessary Storage bucket requirement from PREINSTALL.
- Support both Vertex and Generative Language PaLM API Providers.
- Handle Generative Language Content Filter.
- Add support for providing an API key for the Generative Language PaLM Provider.

## Version 0.1.4

- Improve error handling.
- Reduce unnecessary triggering of generateMessage function
- allow for regenerating responses by changing "status.state" field
- skip messages in history which do not have both a promptField and a responseField

## Version 0.1.3

Add warning about waitlist.

## Version 0.1.2

Updated docs.

## Version 0.1.1

Updated configuration parameters in extension.yaml.

## Version 0.1.0

Initial release of the firestore-palm-chatbot extension.
