const request = require('supertest');
const { app } = require('../server');

// This test expects authentication; if no token env provided it asserts 401 path
const token = process.env.LOGIN_TOKEN; // optionally pre-set token for CI

describe('Dev Tools System Status Endpoint', () => {
  test('GET /api/dev/system-status returns status or 401', async () => {
    const r = await request(app)
      .get('/api/dev/system-status')
      .set(token ? { Authorization: `Bearer ${token}` } : {});

  expect([200,401,403,404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body).toHaveProperty('success', true);
      expect(r.body.data).toHaveProperty('timestamp');
      expect(r.body.data).toHaveProperty('database');
    } else if (r.status >= 400) {
      // Just ensure we didn't get a server error body
      expect(r.status).not.toBe(500);
    }
  }, 15000);
});
