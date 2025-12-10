// Global Jest setup/teardown enhancements to avoid multiple server initializations
process.env.BYPASS_AUTH_FOR_TESTS = 'true';
process.env.DISABLE_INTERVALS_FOR_TESTS = 'true';

const { startServer, app } = require('../server');

if (!global.__APP_INITIALIZED__) {
  global.__APP_INITIALIZED__ = true;
  // Ensure single app with listen=false
  beforeAll(async () => {
    if (!app.get('broadcastUserStats')) {
      await startServer({ listen: false });
    }

    // Ensure SSE registries exist for tests that directly access app.get('sseClients')
    if (!app.get('sseClients')) {
      app.set('sseClients', { users: new Set(), logs: new Set(), orders: new Set(), queue: new Set(), stock: new Set(), notifications: new Set() });
    }

    // Provide a no-op broadcast function to avoid null get() in SSE unit tests
    if (!app.get('broadcastUserStats')) {
      app.set('broadcastUserStats', async () => {});
    }
  });
}

afterAll(async () => {
  try {
    const interval = app.get('usersStatsInterval');
    if (interval) {
      clearInterval(interval);
      app.set('usersStatsInterval', null);
    }
  } catch {}

  try {
    if (app?.stopServer) {
      await app.stopServer();
    }
  } catch {}
});
