module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setupAfterEnv.js'],
  detectOpenHandles: true,
  forceExit: true,
  verbose: true,
  testTimeout: 30000,
  collectCoverage: false,
  moduleFileExtensions: ['js','json'],
  testPathIgnorePatterns: ['/node_modules/'],
  globalSetup: '<rootDir>/tests/setup.global.js',
  globalTeardown: '<rootDir>/tests/teardown.global.js'
};
