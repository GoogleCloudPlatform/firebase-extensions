/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as tf from '@tensorflow/tfjs-node';
import * as admin from 'firebase-admin';

import config from '../config';

let model: tf.GraphModel;

/** Detect base64 vs. GCS path */
export function isBase64Image(image: string): boolean {
  return Buffer.from(image, 'base64').toString('base64') === image;
}

/**
 * Loads a single image (base64 string or GCS path) into a
 * [1, inputShape, inputShape, 3] normalized tensor.
 */
export async function _loadImageAsTensor(image: string): Promise<tf.Tensor4D> {
  const buffer: Uint8Array = await (async () => {
    if (isBase64Image(image)) {
      return Buffer.from(image, 'base64');
    } else {
      const [downloaded] = await admin
        .storage()
        .bucket(config.imgBucket)
        .file(image)
        .download();
      return downloaded;
    }
  })();

  return tf.tidy(() => {
    // decodeImage creates a 3D tensor
    const decoded = tf.node.decodeImage(buffer, 3) as tf.Tensor3D;

    // figure out how to center‐crop to square
    const [h, w] = decoded.shape;
    let box: [number, number, number, number];
    if (w > h) {
      // crop the left and right sides to make it square
      const crop = (1 - h / w) / 2;
      box = [0, crop, 1, 1 - crop];
    } else {
      // crop the top and bottom sides to make it square
      const crop = (1 - w / h) / 2;
      box = [crop, 0, 1 - crop, 1];
    }

    const batched = decoded.expandDims(0) as tf.Tensor4D; // [1,H,W,3]
    const resized = tf.image.cropAndResize(
      batched,
      [box], // boxes: [1,4]
      [0], // boxInd: [1]
      [config.inputShape, config.inputShape]
    ) as tf.Tensor4D; // [1,inputShape,inputShape,3]

    // clean up the intermediates
    decoded.dispose();
    batched.dispose();

    // return a normalized 4D tensor
    return resized.div(255) as tf.Tensor4D;
  });
}

/**
 * Generates embeddings for a given array of images by
 *  - lazy-loading the model once,
 *  - decoding each image in its own tidy,
 *  - batching the concat -> predict in another tidy,
 *  - disposing only what’s no longer needed,
 *  - and logging how many images you actually passed in.
 */
export async function getFeatureVectors(
  images: string[],
  batchSize = 32
): Promise<number[][]> {
  console.log(`→ getFeatureVectors called with ${images.length} images`);

  if (images.length === 0) {
    return [];
  }

  // Lazy-load the model
  if (!model) {
    const fromTFHub = config.modelUrl.includes('tfhub.dev');
    console.log(
      `Loading model from ${config.modelUrl} (fromTFHub=${fromTFHub})`
    );
    model = await tf.loadGraphModel(config.modelUrl, {fromTFHub});
  }

  const preppedTensors: tf.Tensor4D[] = await Promise.all(
    images.map(img => _loadImageAsTensor(img))
  );

  const allEmbeddings: number[][] = [];

  for (let i = 0; i < preppedTensors.length; i += batchSize) {
    const slice = preppedTensors.slice(i, i + batchSize);

    const batchEmbeddings: number[][] = tf.tidy(() => {
      const batch = tf.concat(slice, 0) as tf.Tensor4D;
      const rawOut = model.predict(batch) as tf.Tensor;
      return rawOut.arraySync() as number[][];
    });

    slice.forEach(t => t.dispose());

    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}
