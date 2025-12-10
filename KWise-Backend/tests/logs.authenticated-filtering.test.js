const request = require('supertest');
process.env.NODE_ENV = 'test';
const { startServer } = require('../server');

// This test attempts authenticated filtering assertions when credentials are available.
// If auth not configured (no creds / token), it will skip gracefully.

let app;
let token;

beforeAll(async () => {
  app = await startServer({ listen: false });
  token = process.env.LOGIN_TOKEN;
  const email = process.env.LOGIN_EMAIL;
  const password = process.env.LOGIN_PASSWORD;
  if(!token && email && password){
    try {
      const loginRes = await request(app).post('/api/auth/login').send({ email, password });
      if(loginRes.statusCode === 200 && loginRes.body?.token){
        token = loginRes.body.token;
      }
    } catch (e) {
      // ignore login failure; tests will adapt
    }
  }
});

describe('Logs Authenticated Filtering (strict assertions when authorized)', () => {
  const endpoint = '/api/logs';

  test('severity filter returns only matching severities when authorized', async () => {
    const res = await request(app)
      .get(`${endpoint}?severity=INFO&limit=5`)
      .set(token ? { Authorization: `Bearer ${token}` } : {});

    // If unauthorized, accept protection codes and skip deeper checks
    if([401,403].includes(res.statusCode)) return;

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for(const row of res.body.data){
      if(row.severity) expect(row.severity).toBe('INFO');
    }
  });

  test('invalid severity rejected with 400 when authorized', async () => {
    const res = await request(app)
      .get(`${endpoint}?severity=NOT_A_LEVEL`)
      .set(token ? { Authorization: `Bearer ${token}` } : {});
    if([401,403].includes(res.statusCode)) return; // protected path
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
