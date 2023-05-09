/*
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
import {logger} from 'firebase-functions/v1';

export const noContentType = (objectName: string) => {
  logger.log(
    `File has no Content-Type, no processing is required for '${objectName}}'`
  );
};

export const contentTypeInvalid = (contentType: string, objectName: string) => {
  logger.log(
    `File of type '${contentType}' is not an image, no processing is required for ${objectName}`
  );
};

export const noName = () => {
  logger.log('File has no name, no processing is required');
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

export const imageExtractionFailed = (filePath: string) => {
  logger.log(
    `text extraction did not complete successfully on image ${filePath}`
  );
};

export const successfulImageExtraction = (filePath: string) => {
  logger.log(`text extraction completed successfully on image ${filePath}`);
};

export const noTextFound = (filePath: string) => {
  logger.log(`no text found in image ${filePath}`);
};
