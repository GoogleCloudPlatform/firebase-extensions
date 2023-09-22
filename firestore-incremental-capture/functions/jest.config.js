const packageJson = require('./package.json');

module.exports = {
  name: packageJson.name,
  displayName: packageJson.name,
  rootDir: './',
  globals: {
    'ts-jest': {
      tsConfig: '<rootDir>/__tests__/tsconfig.json',
    },
  },
  testMatch: ['**/__tests__/generateSchema.test.ts'],
  testEnvironment: 'node',
  preset: 'ts-jest',
};
