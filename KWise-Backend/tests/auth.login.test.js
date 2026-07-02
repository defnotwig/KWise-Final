const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app } = require('../server');

describe('Auth Login (In-Memory Test Mode)', () => {
  const email = `login_test_${Date.now()}@example.com`;
  const password = 'LoginPass123';

  test('public role-based registration is blocked', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Login Test', email, password, role: 'superadmin' });
    expect([401, 403]).toContain(reg.status);
  });

  test('test-mode login sets HttpOnly auth and CSRF cookies', async () => {
    const previousBypass = process.env.BYPASS_AUTH_FOR_TESTS;
    process.env.BYPASS_AUTH_FOR_TESTS = 'true';

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('token');
    expect(login.body).toHaveProperty('csrfToken');
    expect(login.body).toHaveProperty('user');
    expect(login.headers['set-cookie'].join(';')).toContain('jwt=');
    expect(login.headers['set-cookie'].join(';')).toContain('HttpOnly');
    expect(login.headers['set-cookie'].join(';')).toContain('kwise_csrf=');

    if (previousBypass === undefined) {
      delete process.env.BYPASS_AUTH_FOR_TESTS;
    } else {
      process.env.BYPASS_AUTH_FOR_TESTS = previousBypass;
    }
  });

  test('login with wrong password fails', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass99' });
    expect([400, 401]).toContain(bad.status);
  });
});
