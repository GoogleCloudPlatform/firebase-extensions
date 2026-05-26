const packageJson = require('./package.json');

module.exports = {
  displayName: packageJson.name,
  rootDir: './',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/__tests__/tsconfig.json',
      },
    ],
  },
  testMatch: ['**/__tests__/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/e2e/'],
  setupFiles: ['<rootDir>/__tests__/jest.setup.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    'firebase-admin/app': '<rootDir>/node_modules/firebase-admin/lib/app',
    'firebase-admin/eventarc':
      '<rootDir>/node_modules/firebase-admin/lib/eventarc',
    'firebase-admin/auth': '<rootDir>/node_modules/firebase-admin/lib/auth',
    'firebase-functions/encoder':
      '<rootDir>/node_modules/firebase-functions/lib/encoder',
    'firebase-admin/database':
      '<rootDir>/node_modules/firebase-admin/lib/database',
    'firebase-functions/lib/encoder':
      '<rootDir>/node_modules/firebase-functions-test/lib/providers/firestore.js',
    'firebase-admin/firestore':
      '<rootDir>/node_modules/firebase-functions/lib/v1/providers/firestore.js',
    'firebase-admin/extensions':
      '<rootDir>/node_modules/firebase-admin/lib/extensions',
  },
};
