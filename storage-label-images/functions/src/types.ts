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

import * as vision from '@google-cloud/vision';
export type VisionClient = vision.v1.ImageAnnotatorClient;
// this isn't exported from the sdk, and is different from IAnnotateImageRequest, but is used in the annotateImage method
export type ImprovedRequest = {
  image?: {
    source?: {
      filename?: string;
      imageUri?: string;
    };
    content?: Uint8Array | string | null;
  };
  features?: any;
  imageContext?: any;
};
export type IAnnotatedImageRequest =
  vision.protos.google.cloud.vision.v1.IAnnotateImageRequest;
export type ImageContext = vision.protos.google.cloud.vision.v1.IImageContext;
export type IAnnotatedImageResponse =
  vision.protos.google.cloud.vision.v1.IAnnotateImageResponse;
export type IEntityAnnotation =
  vision.protos.google.cloud.vision.v1.IEntityAnnotation;
