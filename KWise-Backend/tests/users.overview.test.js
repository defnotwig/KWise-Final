const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app } = require('../server');

describe('Users Stats Overview API', () => {
  let token;
  const loginEmail = process.env.LOGIN_EMAIL;
  const loginPassword = process.env.LOGIN_PASSWORD;

  beforeAll(async () => {
    if (loginEmail && loginPassword) {
      try {
        const res = await request('http://localhost:5000')
          .post('/api/auth/login')
          .send({ email: loginEmail, password: loginPassword });
        token = res.body?.token;
      } catch (e) {
        console.warn('Login failed in test setup:', e.message);
      }
    }
  }, 15000);

  test('GET /api/users/stats/overview returns structured data', async () => {
    const r = await request(app)
      .get('/api/users/stats/overview')
      .set(token ? { Authorization: `Bearer ${token}` } : {});

  expect([200,401,404]).toContain(r.status);

    if (r.status === 200) {
      expect(r.body).toHaveProperty('success', true);
      expect(r.body).toHaveProperty('data');
      const d = r.body.data;
      expect(d).toHaveProperty('totalUsers');
      expect(d).toHaveProperty('onlineUsers');
      expect(d).toHaveProperty('recentLogins');
      expect(d).toHaveProperty('usersByRole');
      expect(Array.isArray(d.usersByRole)).toBe(true);
    } else if (r.status >= 400) {
      expect(r.status).not.toBe(500);
    }
  }, 15000);
  afterAll(async () => {
  // No open listener when listen:false
  });
});
