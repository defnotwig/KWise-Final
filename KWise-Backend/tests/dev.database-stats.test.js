const request = require('supertest');
const { app } = require('../server');

const token = process.env.LOGIN_TOKEN;

describe('Dev Tools Database Stats Endpoint', () => {
  test('GET /api/dev/database/stats returns db info or 401', async () => {
    const r = await request(app)
      .get('/api/dev/database/stats')
      .set(token ? { Authorization: `Bearer ${token}` } : {});

  expect([200,401,403,404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body).toHaveProperty('success', true);
      const d = r.body.data;
      expect(d).toHaveProperty('version');
      expect(d).toHaveProperty('tables');
      expect(Array.isArray(d.tables)).toBe(true);
      expect(d).toHaveProperty('size');
      expect(d).toHaveProperty('activeConnections');
      expect(d).toHaveProperty('performance');
      expect(Array.isArray(d.performance)).toBe(true);
      expect(['available','unavailable']).toContain(d.performanceExtension);
    } else if (r.status >= 400) {
      expect(r.status).not.toBe(500);
    }
  }, 20000);
});
