import * as path from 'path';
import * as functions from 'firebase-functions';
import config from './config';
import * as logs from './logs';
import {ILocalizedObjectAnnotation, ImprovedRequest} from './types';

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

export const shouldDetectObjects = (
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

const FEATURE_TYPE = 'OBJECT_LOCALIZATION';

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

export function formatObjects(objectAnnotations: ILocalizedObjectAnnotation[]) {
  const objects = [];
  for (const annotation of objectAnnotations) {
    if (annotation.name) {
      if (config.mode === 'basic') {
        objects.push(annotation.name);
      }
      if (config.mode === 'full') {
        objects.push(annotation);
      }
    }
  }
  return objects;
}
