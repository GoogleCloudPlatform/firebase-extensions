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

const mockAnnotateVideo = jest.fn();
const bucket = 'demo-test.appspot.com';
const collectionPath = 'imageLabels';

import * as fft from 'firebase-functions-test';
import {ObjectMetadata} from 'firebase-functions/v1/storage';
import setupEnvironment from './helpers/setupEnvironment';
//eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import config from '../src/config';
// import { clearFirestore } from "./helpers";

const functions = require('../src/index');

setupEnvironment();

/** Setup test environment */
const testEnv = fft({
  projectId: 'demo-test',
  storageBucket: bucket,
});

/** Setup Mocks */
jest.mock('../src/config', () => ({
  default: {
    collectionPath,
    bucketName: 'demo-test.appspot.com',
    outputBucket: 'demo-test.appspot.com',
    frameConfidenceThreshold: 0.3,
    labelDetectionMode: 1,
    model: 'test',
    stationaryCamera: true,
    videoConfidenceThreshold: 1,
    inputVideosPath: '',
    outputPath: '',
  },
}));

jest.mock('@google-cloud/video-intelligence', () => ({
  VideoIntelligenceServiceClient: jest.fn(() => ({
    annotateVideo: mockAnnotateVideo,
  })),
  protos: {
    google: {
      cloud: {
        videointelligence: {
          v1: {
            Feature: {
              LABEL_DETECTION: 'LABEL_DETECTION',
            },
          },
        },
      },
    },
  },
}));

describe('labelImage', () => {
  /** Reset mocks on each test */
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully set annotation with the correct configuration', async () => {
    /** Setup object metadata */
    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name: 'test.3g2',
      contentType: 'image/3g2',
    };

    /** Mock annotation value */
    mockAnnotateVideo.mockResolvedValue([
      {
        videoAnnotations: [{}],
      },
    ]);

    /** Run the function */
    const labelVideo = testEnv.wrap(functions.labelVideo);
    await labelVideo(obj);

    /** Test results */
    expect(mockAnnotateVideo).toBeCalledWith({
      inputUri: 'gs://demo-test.appspot.com/test.3g2',
      outputUri: 'gs://demo-test.appspot.comtest.3g2.json',
      locationId: undefined,
      features: [1],
      videoContext: {
        labelDetectionConfig: {
          frameConfidenceThreshold: 0.3,
          labelDetectionMode: 1,
          model: 'test',
          stationaryCamera: true,
          videoConfidenceThreshold: 1,
        },
      },
    });
  });

  it('should not process without a valid object name', async () => {
    /** Setup object metadata */
    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      //eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-ignore
      name: null,
      contentType: '3g2',
    };

    /** Mock annotation value */
    mockAnnotateVideo.mockResolvedValue([
      {
        videoAnnotations: [{}],
      },
    ]);

    /** Run the function */
    const labelVideo = testEnv.wrap(functions.labelVideo);
    await labelVideo(obj);

    /** Test results */
    expect(mockAnnotateVideo).toHaveBeenCalledTimes(0);
  });

  it('should not process with an invalid file type', async () => {
    /** Setup object metadata */
    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name: 'test.png',
      contentType: 'image/png',
    };

    /** Mock annotation value */
    mockAnnotateVideo.mockResolvedValue([
      {
        videoAnnotations: [{}],
      },
    ]);

    const labelVideo = testEnv.wrap(functions.labelVideo);
    await labelVideo(obj);

    /** Test results */
    expect(mockAnnotateVideo).toHaveBeenCalledTimes(0);
  });

  it('should not process with an invalid file type', async () => {
    /** Setup object metadata */
    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name: 'test.png',
      contentType: 'image/png',
    };

    /** Mock annotation value */
    mockAnnotateVideo.mockResolvedValue([
      {
        videoAnnotations: [{}],
      },
    ]);

    /** Run the function */
    const labelVideo = testEnv.wrap(functions.labelVideo);
    await labelVideo(obj);

    /** Test results */
    expect(mockAnnotateVideo).toHaveBeenCalledTimes(0);
  });

  it('should not process when not ina  configured folder', async () => {
    /** Setup object metadata */
    const obj: ObjectMetadata = {
      kind: '',
      id: '',
      bucket,
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
      name: 'test.3g2',
      contentType: '3g2',
    };

    /** Mock annotation value */
    config.inputVideosPath = 'test';

    mockAnnotateVideo.mockResolvedValue([
      {
        videoAnnotations: [{}],
      },
    ]);

    /** Run the function */
    const labelVideo = testEnv.wrap(functions.labelVideo);
    await labelVideo(obj);

    /** Test results */
    expect(mockAnnotateVideo).toHaveBeenCalledTimes(0);
  });
});
