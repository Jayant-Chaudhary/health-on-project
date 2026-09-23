// server/jest.config.js
module.exports = {
  testEnvironment: 'node',
  clearMocks: true, // Automatically clear mock calls before every test
  collectCoverage: true,
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'], // Look for tests in a 'tests' folder
};