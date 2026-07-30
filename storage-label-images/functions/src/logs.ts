/**
 * Copyright 2026 Google LLC
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

export const labelingImage = (imagePath: string) => {
  logger.log(`Labeling image: ${imagePath}`);
};

export const labelingComplete = (imagePath: string) => {
  logger.log(`Labeling complete for image: ${imagePath}`);
};

export const labelingError = (imagePath: string, error: unknown) => {
  logger.error(`Labeling failed for image: ${imagePath}`, error);
};

export const writingToFirestore = (imagePath: string) => {
  logger.log(`Writing labels to Firestore for image: ${imagePath}`);
};

export const noLabels = (imagePath: string) => {
  logger.log(`No labels found for image: ${imagePath}`);
};

export const functionTriggered = (config: Record<string, any>) => {
  logger.log(`Function triggered with config: ${config}`);
};
