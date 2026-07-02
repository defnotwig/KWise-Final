// Global Jest setup/teardown enhancements
// This file runs before EACH TEST FILE (setupFilesAfterFramework)
// It initializes the app once per test file run (globalSetup runs in a separate process)
// It MUST NOT bypass auth globally — use generateTestToken() in individual tests

process.env.NODE_ENV = 'test';
process.env.DISABLE_INTERVALS_FOR_TESTS = 'true';

const { startServer, app } = require('../server');

// ✅ Initialize app once per test file (globalSetup runs in separate process, so this is needed)
if (!global.__APP_INITIALIZED__) {
  global.__APP_INITIALIZED__ = true;
  beforeAll(async () => {
    await startServer({ listen: false });
  });
}

// ✅ Make test token generator available globally (NOT auth bypass — real tokens)
try {
  const { generateTestToken, generateExpiredToken, generateInvalidToken, authHeader } = require('./helpers/authHelpers');
  global.generateTestToken = generateTestToken;
  global.generateExpiredToken = generateExpiredToken;
  global.generateInvalidToken = generateInvalidToken;
  global.authHeader = authHeader;
} catch (err) {
  // authHelpers may not exist yet — tests will fail explicitly rather than silently bypassing auth
  console.warn('[setupAfterEnv] authHelpers.js not found — tests requiring auth tokens will fail.');
}

// ✅ Ensure SSE registries exist for tests that directly access app.get('sseClients')
if (!app.get('sseClients')) {
  app.set('sseClients', {
    users: new Set(),
    logs: new Set(),
    orders: new Set(),
    queue: new Set(),
    stock: new Set(),
    notifications: new Set(),
  });
}

// ✅ Provide a no-op broadcast function to avoid null get() in SSE unit tests
if (!app.get('broadcastUserStats')) {
  app.set('broadcastUserStats', async () => {});
}

// ✅ Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// ✅ Restore all mocks between test files
afterAll(() => {
  jest.restoreAllMocks();
});

// ❌ REMOVED: process.env.BYPASS_AUTH_FOR_TESTS = 'true'
// ❌ REMOVED: afterAll server teardown — handled by teardown.global.js
