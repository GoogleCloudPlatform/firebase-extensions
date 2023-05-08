import * as tf from '@tensorflow/tfjs-node';
import * as admin from 'firebase-admin';

import config from '../config';

let model: tf.GraphModel;

export function isBase64Image(image: string): boolean {
  return Buffer.from(image, 'base64').toString('base64') === image;
}

/**
 * Generates embeddings for a given array of sentences using Universal Sentence Encoder model.
 *
 * @param image path to image.
 * @param key the key of the text in the document.
 * @returns an array of arrays containing 512 numbers representing the embedding of the text.
 */
export async function getFeatureVectors(images: string[]): Promise<any> {
  if (images.length === 0) {
    return [];
  }

  if (!model) {
    const fromTFHub = config.modelUrl.includes('tfhub.dev');
    console.log(
      `Loading the model from ${config.modelUrl} 📦, fromTFHub: ${fromTFHub}`
    );
    try {
      model = await tf.loadGraphModel(
        // This link should be public and points to a directory where the exported model.json and its weigths exist.
        config.modelUrl,
        {
          fromTFHub: fromTFHub,
        }
      );
    } catch (error) {
      throw new Error(`Error loading the model: ${error}`);
    }
  }

  const imagesT = (await Promise.all(
    images.map(image => {
      const img = _loadImageAsTensor(image);
      return img as Promise<tf.Tensor>;
    })
  )) as tf.Tensor[];

  const imageBatch = tf.concat(imagesT, 0);

  const embeddings = model.predict(imageBatch) as tf.Tensor;

  tf.dispose();

  return embeddings.arraySync();
}

/**
 * Takes an image in a GCS bucket and returns its tensor.
 * The image is resized to 224x224 and normalized to [0, 1].
 *
 * @param imagePath the path to the image in a GCS bucket.
 */
async function _loadImageAsTensor(image: string) {
  let buffer: Uint8Array;

  if (isBase64Image(image)) {
    buffer = Buffer.from(image, 'base64');
  } else {
    const [download] = await admin
      .storage()
      .bucket(config.imgBucket)
      .file(image)
      .download();

    buffer = download;
  }

  const decodedImage = tf.tidy(() => tf.node.decodeImage(buffer, 3));

  const widthToHeight = decodedImage.shape[1] / decodedImage.shape[0];

  let squareCrop: number[][];

  if (widthToHeight > 1) {
    const heightToWidth = decodedImage.shape[0] / decodedImage.shape[1];
    const cropTop = (1 - heightToWidth) / 2;
    const cropBottom = 1 - cropTop;
    squareCrop = [[cropTop, 0, cropBottom, 1]];
  } else {
    const cropLeft = (1 - widthToHeight) / 2;
    const cropRight = 1 - cropLeft;
    squareCrop = [[0, cropLeft, 1, cropRight]];
  }

  const expandedImage = decodedImage.expandDims(0);

  const crop = tf.tidy(() =>
    tf.image.cropAndResize(
      expandedImage.arraySync(),
      squareCrop,
      [0],
      [config.inputShape, config.inputShape]
    )
  );

  return crop.div(255);
}
