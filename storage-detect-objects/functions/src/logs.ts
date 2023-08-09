import * as functions from 'firebase-functions';

const logger = functions.logger;

export const complete = () => {
  logger.log('Completed execution of extension');
};

export const noContentType = () => {
  logger.log(
    'Ignoring file as unable to detect Content-Type, no processing is required.'
  );
};

export const imageOutsideOfPaths = (
  absolutePaths: string[],
  imagePath: string
) => {
  logger.log(
    `Image path '${imagePath}' is not supported, these are the supported absolute paths: ${absolutePaths.join(
      ', '
    )}`
  );
};

export const imageInsideOfExcludedPaths = (
  absolutePaths: string[],
  imagePath: string
) => {
  logger.log(
    `Image path '${imagePath}' is not supported, these are the not supported absolute paths: ${absolutePaths.join(
      ', '
    )}`
  );
};

export const contentTypeInvalid = (contentType: string) => {
  logger.log(
    `File of type '${contentType}' is not an image, no processing is required`
  );
};

export const noName = () => {
  logger.log(
    'Ignoring file as unable to detect name, no processing is required.'
  );
};

export const detectingObjects = (imagePath: string) => {
  logger.log(`Detecting objects: ${imagePath}`);
};

export const objectsDetectionComplete = (imagePath: string) => {
  logger.log(`Objects detection complete for image: ${imagePath}`);
};

export const objectsDetectionError = (imagePath: string, error: unknown) => {
  logger.error(`Objects detection failed for image: ${imagePath}`, error);
};

export const writingToFirestore = (imagePath: string) => {
  logger.log(`Writing objects to Firestore for image: ${imagePath}`);
};

export const noObjects = (imagePath: string) => {
  logger.log(`No objects found in image: ${imagePath}`);
};

export const functionTriggered = (config: Record<string, any>) => {
  logger.log(`Function triggered with config: ${config}`);
};
