module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/*.test.ts'],
  // The feature_vectors unit specs load a real TensorFlow model over the
  // network and assert on real tensors, so they require the native
  // @tensorflow/tfjs-node addon. That addon is not present in CI (dependencies
  // are installed with --ignore-scripts), so they belong to the integration
  // run (jest.integration.config.js), not the default unit run.
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__/unit/feature_vectors\\.test\\.ts$',
    '__tests__/unit/feature_vectors\\.memory\\.test\\.ts$',
  ],
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/functions/cleanup.ts'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleNameMapper: {
    // Redirect @tensorflow/tfjs-node to a lightweight stub. The real package
    // loads a native addon at require time that is absent in CI, which caused
    // every suite transitively importing feature_vectors.ts to fail to run.
    // See test-config/tfjs-node.stub.js.
    '^@tensorflow/tfjs-node$': '<rootDir>/test-config/tfjs-node.stub.js',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
};
