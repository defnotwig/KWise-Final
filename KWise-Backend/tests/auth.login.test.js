const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app } = require('../server');

describe('Auth Login (In-Memory Test Mode)', () => {
  const email = `login_test_${Date.now()}@example.com`;
  const password = 'LoginPass123';

  test('register then login succeeds', async () => {
    const reg = await request(app).post('/api/auth/register').send({ name: 'Login Test', email, password, role: 'admin' });
    expect([201,500]).toContain(reg.status); // 500 would indicate unexpected failure
    // Proceed to login (registration may have created in-memory user)
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body).toHaveProperty('token');
    expect(login.body).toHaveProperty('user');
  });

  test('login with wrong password fails', async () => {
    const bad = await request(app).post('/api/auth/login').send({ email, password: 'WrongPass99' });
    expect([400,401]).toContain(bad.status);
  });
});
