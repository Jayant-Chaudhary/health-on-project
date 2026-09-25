// server/jest.config.js
//
// E2E tests (*.e2e.test.js) talk to a live OCR service and are excluded from
// the default run. `npm run test:e2e` sets RUN_E2E=true to run only them.
const e2e = process.env.RUN_E2E === 'true';

module.exports = {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverage: !e2e,
  coverageDirectory: 'coverage',
  testMatch: e2e ? ['**/tests/**/*.e2e.test.js'] : ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: e2e ? ['/node_modules/'] : ['/node_modules/', '\.e2e\.test\.js$'],
  // Real OCR on CPU takes seconds per page.
  testTimeout: e2e ? 300000 : 5000,
};
