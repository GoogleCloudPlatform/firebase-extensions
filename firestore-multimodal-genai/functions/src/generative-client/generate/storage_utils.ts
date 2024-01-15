import * as admin from 'firebase-admin';

enum ImageUrlSource {
  BASE64 = 'base64',
  STORAGE = 'storage',
}

export function isBase64Image(image: string): boolean {
  return Buffer.from(image, 'base64').toString('base64') === image;
}

export const isFromStorage = (image: string): boolean => {
  return image.startsWith('gs://');
};

function getImageSource(image: string): ImageUrlSource {
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
  switch (getImageSource(image)) {
    case ImageUrlSource.BASE64:
      return image;
    case ImageUrlSource.STORAGE: {
      const buffer = (await getBufferFromStorage(image))[0];
      return buffer.toString('base64');
    }
    default:
      // TODO: handle this case properly and test
      throw new Error(
        'Image must be either a base64 string or a file in cloud storage.'
      );
  }
}

export async function getBufferFromStorage(image: string) {
  // e.g from gs://invertase--palm-demo.appspot.com/the-matrix.jpeg
  // we get invertase--palm-demo.appspot.com
  const bucketName = extractBucketName(image);

  const fileName = image.split(bucketName + '/')[1];

  return admin.storage().bucket(bucketName).file(fileName).download();
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
