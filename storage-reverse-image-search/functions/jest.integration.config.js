const base = require('./jest.config');

// Integration config for the specs that exercise the real TensorFlow model
// (native @tensorflow/tfjs-node addon plus a network model download). These are
// intentionally excluded from the default `test` run because CI installs with
// --ignore-scripts and has no addon. Run locally with `npm run test:integration`
// after the native addon has been built.
module.exports = Object.assign({}, base, {
  // Use the real @tensorflow/tfjs-node, not the unit stub.
  moduleNameMapper: {},
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: [
    '**/__tests__/unit/feature_vectors.test.ts',
    '**/__tests__/unit/feature_vectors.memory.test.ts',
  ],
});
