// server/jest.config.js
module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'],
  // E2E tests (ocr.e2e.test.js) are excluded from the default run.
  // Use `npm run test:e2e` to run them against a live OCR service.
  testPathIgnorePatterns: ['/node_modules/', '\.e2e\.test\.js$'],
};