module.exports = {
  preset: 'ts-jest',
  testMatch: ['**/*.test.ts'],
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/functions/cleanup.ts'],
  moduleNameMapper: {
    // Redirect the TensorFlow packages to lightweight stubs. The real
    // @tensorflow/tfjs-node loads a native addon at require time that is absent
    // in CI (deps installed with --ignore-scripts), which caused unrelated
    // suites to fail to run. See __mocks__/@tensorflow/.
    '^@tensorflow/tfjs-node$': '<rootDir>/__mocks__/@tensorflow/tfjs-node.js',
    '^@tensorflow-models/universal-sentence-encoder$':
      '<rootDir>/__mocks__/@tensorflow-models/universal-sentence-encoder.js',
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
