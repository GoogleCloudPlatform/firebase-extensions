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
import * as functions from 'firebase-functions';
import * as path from 'path';
// import * as logs from './logs';
import config from './config';

export const shouldExtractText = (
  object: functions.storage.ObjectMetadata
): boolean => {
  if (!object.name) {
    // logs.noName();
    return false;
  }
  const {contentType} = object;
  const tmpFilePath = path.resolve('/', path.dirname(object.name)); // Absolute path to dirname

  if (!contentType) {
    // logs.noContentType(object.name);
    return false;
  }
  if (
    config.includePathList &&
    !startsWithArray(config.includePathList, tmpFilePath)
  ) {
    // logs.imageOutsideOfPaths(config.includePathList, tmpFilePath);
    return false;
  }

  if (
    config.excludePathList &&
    startsWithArray(config.excludePathList, tmpFilePath)
  ) {
    // logs.imageInsideOfExcludedPaths(config.excludePathList, tmpFilePath);
    return false;
  }
  return true;
};

export const startsWithArray = (array: string[], str: string): boolean => {
  return array.some(p => str.startsWith(p));
};
