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

import * as path from 'path';
import * as functions from 'firebase-functions';
import config from './config';
import * as logs from './logs';
import {IEntityAnnotation, ImprovedRequest} from './types';

export const startsWithArray = (
  userInputPaths: string[],
  imagePath: string
) => {
  for (const userPath of userInputPaths) {
    const trimmedUserPath = userPath
      .trim()
      .replace(/\*/g, '([a-zA-Z0-9_\\-.\\s\\/]*)?');

    const regex = new RegExp('^' + trimmedUserPath + '(?:/.*|$)');

    if (regex.test(imagePath)) {
      return true;
    }
  }
  return false;
};

export const shouldLabelImage = (
  object: functions.storage.ObjectMetadata
): boolean => {
  if (!object.name) {
    logs.noName();
    return false;
  }
  const tmpFilePath = path.resolve('/', path.dirname(object.name));

  if (
    config.includePathList &&
    !startsWithArray(config.includePathList, tmpFilePath)
  ) {
    logs.imageOutsideOfPaths(config.includePathList, tmpFilePath);
    return false;
  }

  if (
    config.excludePathList &&
    startsWithArray(config.excludePathList, tmpFilePath)
  ) {
    logs.imageInsideOfExcludedPaths(config.excludePathList, tmpFilePath);
    return false;
  }
  const {contentType} = object; // This is the image MIME type
  if (!contentType) {
    logs.noContentType();
    return false;
  }
  if (!contentType.startsWith('image/')) {
    logs.contentTypeInvalid(contentType);
    return false;
  }
  return true;
};

const FEATURE_TYPE = 'LABEL_DETECTION';

export const getVisionRequest = (imageBase64: string): ImprovedRequest => ({
  image: {
    content: imageBase64,
  },
  features: [
    {
      type: FEATURE_TYPE,
    },
  ],
});

export function formatLabels(labelAnnotations: IEntityAnnotation[]) {
  const labels = [];
  for (const annotation of labelAnnotations) {
    if (annotation.description) {
      if (config.mode === 'basic') {
        labels.push(annotation.description);
      }
      if (config.mode === 'full') {
        labels.push(annotation);
      }
    }
  }
  return labels;
}
