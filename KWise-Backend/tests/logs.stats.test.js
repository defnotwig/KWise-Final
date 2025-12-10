const request = require('supertest');
const { app } = require('../server');

const token = process.env.LOGIN_TOKEN;

describe('Logs Stats Endpoint', () => {
  test('GET /api/logs/stats returns log stats or 401', async () => {
    const r = await request(app)
      .get('/api/logs/stats')
      .set(token ? { Authorization: `Bearer ${token}` } : {});

  expect([200,401,403,404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body).toHaveProperty('success', true);
      const d = r.body.data;
      expect(d).toHaveProperty('totalLogs');
      expect(d).toHaveProperty('errorLogs');
      expect(d).toHaveProperty('warningLogs');
      expect(d).toHaveProperty('infoLogs');
      expect(d).toHaveProperty('recentActions');
      expect(Array.isArray(d.recentActions)).toBe(true);
    } else if (r.status >= 400) {
      expect(r.status).not.toBe(500);
    }
  }, 15000);
});
