export default {
  vertex: {
    model: 'gemini-1.0-pro',
  },
  googleAi: {
    model: 'gemini-1.0-pro',
    apiKey: 'test-api-key',
  },
  model: 'gemini-1.0-pro',
  location: 'europe-west1',
  projectId: 'text-project-id',
  instanceId: 'text-instance-id',
  collectionName: 'discussions',
  prompt: 'test prompt',
  responseField: 'output',
  provider: 'vertex-ai',
  vertexAiLocation: 'us-central1',
  apiKey: process.env.API_KEY,
  bucketName: 'demo-gcp.appspot.com',
  imageField: 'image',
  candidates: {
    field: 'candidates',
    count: 5,
    shouldIncludeCandidatesField: true,
  },
};
