import * as tf from '@tensorflow/tfjs-node';
import {
  getFeatureVectors,
  _loadImageAsTensor,
} from '../../src/common/feature_vectors';

//
// Minimal 1×1 transparent PNG (raw base64), reused below.
//
const tinyPng1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

jest.mock('firebase-admin', () => {
  const downloadMock = jest.fn().mockResolvedValue([
    Buffer.from(
      // inline the same tiny PNG base64 to avoid closure issues
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    ),
  ]);
  const fileMock = jest.fn(() => ({download: downloadMock}));
  const bucketMock = jest.fn(() => ({file: fileMock}));
  return {
    storage: () => ({bucket: bucketMock}),
  };
});

jest.mock('../../src/config', () => ({
  default: {
    modelUrl:
      'https://storage.googleapis.com/tfjs-models/savedmodel/mobilenet_v2_1.0_224/model.json',
    inputShape: 224,
    imgBucket: 'unused',
    modelFromTFHub: false,
  },
}));

// allow time for model download
jest.setTimeout(300_000);

describe('Memory usage (no leaks)', () => {
  it('does not leak tensors when loading a single image', async () => {
    const before = tf.memory().numTensors;
    const tensor = await _loadImageAsTensor(tinyPng1x1);

    // After load, exactly one new tensor ([1,224,224,3])
    const afterLoad = tf.memory().numTensors;
    expect(afterLoad).toBe(before + 1);

    // Dispose and ensure we return to baseline
    tensor.dispose();
    const afterDispose = tf.memory().numTensors;
    expect(afterDispose).toBe(before);
  });

  it('does not leak tensors when generating feature vectors (multiple calls)', async () => {
    // First call loads the model and produces one persistent set of weights.
    await getFeatureVectors([tinyPng1x1]);
    const baseline = tf.memory().numTensors;

    // Call it a few more times, each with 2 images,
    // and assert memory stays at exactly baseline.
    for (let i = 0; i < 3; i++) {
      const embeddings = await getFeatureVectors([tinyPng1x1, tinyPng1x1]);
      expect(Array.isArray(embeddings)).toBe(true);
      expect(embeddings).toHaveLength(2);

      // No new tensors should have been leaked
      expect(tf.memory().numTensors).toBe(baseline);
    }
  });
});
