import * as tf from '@tensorflow/tfjs-node';
import config from '../../src/config';
import {
  getFeatureVectors,
  _loadImageAsTensor,
} from '../../src/common/feature_vectors';

//
// 1×1 transparent PNG (valid minimal PNG), no “data:” prefix—just raw base64.
//
const tinyPng1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

jest.mock('firebase-admin', () => {
  const downloadMock = jest
    .fn()
    .mockResolvedValue([
      Buffer.from(
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

// Allow plenty of time for real-model download
jest.setTimeout(300_000);

describe('getFeatureVectors()', () => {
  it('immediately returns [] when given an empty array', async () => {
    await expect(getFeatureVectors([])).resolves.toEqual([]);
  });

  it('loads the real model and produces embeddings for base64 images', async () => {
    const embeddings = await getFeatureVectors([tinyPng1x1, tinyPng1x1]);

    // should be an array of length 2
    expect(Array.isArray(embeddings)).toBe(true);
    expect(embeddings).toHaveLength(2);

    // each embedding is a non-empty number[]
    expect(Array.isArray(embeddings[0])).toBe(true);
    expect(typeof embeddings[0][0]).toBe('number');
    expect(embeddings[0].length).toBeGreaterThan(0);
  });

  it('downloads and processes images from GCS for non-base64 strings', async () => {
    const fakePath = 'some/fake/object.png';
    const embeddings = await getFeatureVectors([fakePath]);

    expect(Array.isArray(embeddings)).toBe(true);
    expect(embeddings).toHaveLength(1);
    expect(Array.isArray(embeddings[0])).toBe(true);
    expect(typeof embeddings[0][0]).toBe('number');
    expect(embeddings[0].length).toBeGreaterThan(0);
  });
});

describe('_loadImageAsTensor()', () => {
  it('returns a [1, 224, 224, 3] float32 tensor for a base64 PNG', async () => {
    const tensor = await _loadImageAsTensor(tinyPng1x1);

    expect(tensor).toBeInstanceOf(tf.Tensor);
    expect(tensor.dtype).toBe('float32');
    expect(tensor.shape).toEqual([1, config.inputShape, config.inputShape, 3]);

    // all values normalized in [0,1]
    const data = tensor.dataSync();
    expect(
      Array.from(data).every(v => (v as number) >= 0 && (v as number) <= 1)
    ).toBe(true);

    tensor.dispose();
  });

  it('returns the same shape tensor for a GCS path (via firebase-admin mock)', async () => {
    const tensor = await _loadImageAsTensor('uploads/foo.png');
    expect(tensor.shape).toEqual([1, 224, 224, 3]);
    tensor.dispose();
  });
});
