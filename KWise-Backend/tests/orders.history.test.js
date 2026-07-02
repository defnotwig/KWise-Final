const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app } = require('../server');
const { generateTestToken, authHeader } = require('./helpers/authHelpers');

describe('Orders History API', () => {
  let adminToken;

  beforeAll(() => {
    adminToken = generateTestToken({ role: 'admin' });
  });

  test('returns transaction list for authenticated request', async () => {
    const res = await request(app)
      .get('/api/orders/history/transactions')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });

  test('returns paginated results with page and limit params', async () => {
    const res = await request(app)
      .get('/api/orders/history/transactions?page=1&limit=10')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });

  test('filters by assistedBy parameter', async () => {
    const res = await request(app)
      .get('/api/orders/history/transactions?assistedBy=1')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('data');
  });

  test('returns assistants list', async () => {
    const res = await request(app)
      .get('/api/orders/assistants')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
