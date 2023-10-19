import {isImage} from '../../src/common/utils';

jest.mock('../../src/config', () => ({
  default: {
    // System vars
    location: 'us-central1',
    projectId: 'demo-gcp',
    instanceId: 'test-instance',

    // User-defined vars
    path: 'images',
    modelUrl: 'test-model-url',
    imgBucket: 'test-bucket',
    batchSize: 50,
    distanceMeasureType: 'DOT_PRODUCT_DISTANCE',
    algorithmConfig: 'treeAhConfig',
    inputShape: 256,
    bucketName: 'demo-gcp-ext-test-instance',

    // Extension-specific vars
    tasksDoc: '_ext-test-instance/tasks',
    metadataDoc: '_ext-test-instance/metadata',
  },
}));

describe('isImage', () => {
  test('should return true for valid image extensions', () => {
    const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp'];

    validExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(true);
    });
  });

  test('should return false for invalid image extensions', () => {
    const invalidExtensions = ['txt', 'pdf', 'docx', 'mp4'];

    invalidExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(false);
    });
  });

  test('should return false for filenames with no extension', () => {
    const filename = 'test';
    expect(isImage(filename)).toBe(false);
  });

  test('should be case-insensitive', () => {
    const uppercaseExtensions = ['JPG', 'JPEG', 'PNG', 'GIF', 'BMP'];

    uppercaseExtensions.forEach(extension => {
      const filename = `test.${extension}`;
      expect(isImage(filename)).toBe(true);
    });
  });
});
