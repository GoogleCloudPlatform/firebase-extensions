import * as admin from 'firebase-admin';
import {logger} from 'firebase-functions/v1';
import * as sharp from 'sharp';
import config from '../../config';

export const enum ImageUrlSource {
  BASE64 = 'base64',
  STORAGE = 'storage',
}

export function isBase64Image(image: string): boolean {
  return Buffer.from(image, 'base64').toString('base64') === image;
}

export const isFromStorage = (image: string): boolean => {
  return image.startsWith('gs://');
};

export function getImageSource(image: string): ImageUrlSource {
  if (isBase64Image(image)) {
    return ImageUrlSource.BASE64;
  }
  if (isFromStorage(image)) {
    return ImageUrlSource.STORAGE;
  }
  throw new Error(
    `Invalid image source: ${image}, only gs:// and base64 supported.`
  );
}

export async function getImageBase64(image: string): Promise<string> {
  let buffer;
  let imageExtension;

  switch (getImageSource(image)) {
    case ImageUrlSource.BASE64:
      buffer = Buffer.from(image, 'base64');
      imageExtension = image.split(';')[0].split('/')[1];
      break;

    case ImageUrlSource.STORAGE:
      ({buffer, imageExtension} = await getImageFromStorage(image));
      break;

    default:
      throw new Error(
        'Image must be either a base64 string or a file in cloud storage.'
      );
  }

  const imageSize = buffer.byteLength / 1_000_000;

  if (
    (imageSize > 0.999 && config.provider === 'google-ai') ||
    imageSize > 3.99
  ) {
    logger.info(`Image size: ${imageSize}MB`);
    logger.warn(
      `Image is too large (${imageSize}MB) for Google AI api, extension will attempt to compress image.`
    );
    logger.info(`Compressing image with extension ${imageExtension}`);
    performance.mark('start-compress');
    const compressedImage = await compressImageBuffer(buffer, imageExtension);
    performance.mark('end-compress');
    const measure = performance.measure(
      'compress',
      'start-compress',
      'end-compress'
    );
    logger.info(`Compression took ${measure.duration}ms`);
    logger.info(
      `Compressed image size: ${compressedImage.byteLength / 1_000_000}MB`
    );
    return compressedImage.toString('base64');
  }

  return buffer.toString('base64');
}

export async function getImageFromStorage(image: string) {
  // e.g from gs://invertase--palm-demo.appspot.com/the-matrix.jpeg
  // we get invertase--palm-demo.appspot.com
  const bucketName = extractBucketName(image);

  const fileName = image.split(bucketName + '/')[1];

  const imageExtension = fileName.split('.')[fileName.split('.').length - 1];

  return {
    buffer: (
      await admin.storage().bucket(bucketName).file(fileName).download()
    )[0],
    imageExtension,
  };
}

export function extractBucketName(url: string) {
  // Split the URL by '://'
  const parts = url.split('gs://');

  // Check if the URL is correctly formatted
  if (parts.length !== 2) {
    return 'Invalid URL format';
  }

  // Further split the second part by '/' to isolate the bucket name
  const bucketAndPath = parts[1].split('/', 1);
  const bucketName = bucketAndPath[0];

  return bucketName;
}

export const compressImageBuffer = async (
  buffer: Buffer,
  imageExtension: string
) => {
  logger.info(`Compressing image with extension ${imageExtension}`);
  switch (imageExtension) {
    case 'png':
      return await sharp(buffer)
        .png({quality: 50, compressionLevel: 6})
        .resize(200, 200, {fit: 'inside'})
        .toBuffer();
    case 'jpg':
      return await sharp(buffer)
        .jpeg({quality: 50})
        .resize(200, 200, {fit: 'inside'})
        .toBuffer();
    case 'jpeg':
      return await sharp(buffer)
        .jpeg({quality: 50})
        .resize(200, 200, {fit: 'inside'})
        .toBuffer();
    default:
      throw new Error(`Image extension ${imageExtension} not supported.`);
  }
};
