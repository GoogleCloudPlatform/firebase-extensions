import * as functionsTest from 'firebase-functions-test';
import * as functions from 'firebase-functions';
import {Status} from '../src/types';
import {transcribeAudio} from '../src/index';
import {
  transcribeAndUpload,
  uploadTranscodedFile,
} from '../src/transcribe-audio';
import {EventContextOptions} from 'firebase-functions-test/lib/v1';

import config from '../src/config';

// Initialize the firebase-functions-test library
const testEnv = functionsTest({
  projectId: 'demo-gcp',
  storageBucket: 'demo-gcp.appspot.com',
});

// Mock the config module
jest.mock('../src/config', () => {
  return {
    default: {
      projectId: 'demo-gcp',
      location: 'us-central1',
      collectionPath: 'test_collection',
      bucket: 'demo-gcp.appspot.com',
      outputStoragePath: '',
      model: null,
      languageCode: 'en-GB',
      includePath: 'location/thisone', // Set the include path for testing
    },
  };
});

// Mock the other imported modules
jest.mock('../src/transcribe-audio', () => ({
  transcodeToLinear16: jest.fn(() => ({
    status: Status.SUCCESS,
    outputPath: 'transcoded-file-path',
    sampleRateHertz: 16000,
    audioChannelCount: 1,
  })),
  transcribeAndUpload: jest.fn(() => ({
    transcription: 'test transcription',
    status: Status.SUCCESS,
  })),
  uploadTranscodedFile: jest.fn(() => ({
    status: Status.SUCCESS,
    transcription: 'test transcription',
    uploadResponse: [{}, {}],
    outputPath: '',
  })),
}));

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  storage: jest.fn(() => ({
    bucket: jest.fn(() => ({
      file: jest.fn(() => ({
        download: jest.fn().mockResolvedValue([Buffer.from('test')]),
      })),
    })),
  })),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      add: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
      doc: jest.fn(() => ({
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      })),
    })),
  })),
}));

describe('Path filtering', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should process file when path matches include path', async () => {
    // Arrange: create a storage object with matching path
    const object: functions.storage.ObjectMetadata & EventContextOptions = {
      name: 'location/thisone/test.wav',
      bucket: 'demo-gcp.appspot.com',
      contentType: 'audio/wav',
      kind: '',
      id: '',
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
    };

    // Act: call the transcribeAudio function
    const fn = testEnv.wrap(transcribeAudio);
    await fn(object);

    // Assert: check if the processing functions were called
    expect(transcribeAndUpload).toHaveBeenCalledTimes(1);
    expect(uploadTranscodedFile).toHaveBeenCalledTimes(1);
  });

  test('should not process file when path does not match include path', async () => {
    // Arrange: create a storage object with non-matching path
    const object: functions.storage.ObjectMetadata & EventContextOptions = {
      name: 'location/other/test.wav',
      bucket: 'demo-gcp.appspot.com',
      contentType: 'audio/wav',
      kind: '',
      id: '',
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
    };

    // Act: call the transcribeAudio function
    const fn = testEnv.wrap(transcribeAudio);
    await fn(object);

    // Assert: check if the processing functions were not called
    expect(transcribeAndUpload).toHaveBeenCalledTimes(0);
    expect(uploadTranscodedFile).toHaveBeenCalledTimes(0);
  });

  test('should process all files when include path is not set', async () => {
    // Arrange: temporarily set includePath to empty string
    const originalIncludePath = config.includePath;
    config.includePath = '';

    // Create a storage object
    const object: functions.storage.ObjectMetadata & EventContextOptions = {
      name: 'any/path/test.wav',
      bucket: 'demo-gcp.appspot.com',
      contentType: 'audio/wav',
      kind: '',
      id: '',
      storageClass: '',
      size: '',
      timeCreated: '',
      updated: '',
    };

    // Act: call the transcribeAudio function
    const fn = testEnv.wrap(transcribeAudio);
    await fn(object);

    // Assert: check if the processing functions were called
    expect(transcribeAndUpload).toHaveBeenCalledTimes(1);
    expect(uploadTranscodedFile).toHaveBeenCalledTimes(1);

    // Cleanup: restore original includePath
    config.includePath = originalIncludePath;
  });
}); 