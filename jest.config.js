module.exports = {
  projects: ['<rootDir>/*/functions/jest.config.js'],
  testPathIgnorePatterns: [
    '.*/bin/',
    '.*/lib/',
    '.*/firestore-counter/',
    '/node_modules/',
    // Ignoring otherwise tests duplicate due to Jest `projects`
    '.*/__tests__/.*.ts',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/test-data/**',
  ],
  maxConcurrency: 10,
};
