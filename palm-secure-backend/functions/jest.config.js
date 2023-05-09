const { compilerOptions } = require('./tsconfig.json');

module.exports = {
    preset: 'ts-jest',
    testMatch: ['**/*.test.ts'],
    testEnvironment: 'node',
    collectCoverage: true,
    collectCoverageFrom: ['src/**/*.ts', '!src/functions/cleanup.ts'],
    transform: {
        '^.+\\.ts$': [
          'ts-jest',
          {
            isolatedModules: true,
          },
        ],
      }
}