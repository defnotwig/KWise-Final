const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app, startServer } = require('../server');

// Basic roles metadata endpoint test (tolerant of auth requirements)
describe('GET /api/users/roles/available', () => {
  let token;
  beforeAll(async () => {
    // Attempt login if env creds provided (optional)
    if (process.env.LOGIN_EMAIL && process.env.LOGIN_PASSWORD) {
      try {
        const res = await request('http://localhost:5000')
          .post('/api/auth/login')
          .send({ email: process.env.LOGIN_EMAIL, password: process.env.LOGIN_PASSWORD });
        token = res.body?.token;
      } catch (e) {
        // Non-fatal
      }
    }
  });

  test('returns roles metadata or appropriate auth error', async () => {
    const r = await request(app)
      .get('/api/users/roles/available')
      .set(token ? { Authorization: `Bearer ${token}` } : {});

    // Acceptable responses: 200 (success) or 401/403 (auth required) but never 500
    expect([200,401,403]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body).toHaveProperty('success', true);
      expect(Array.isArray(r.body.data)).toBe(true);
      const sample = r.body.data[0];
      expect(sample).toHaveProperty('value');
      expect(sample).toHaveProperty('label');
    }
  });
});
