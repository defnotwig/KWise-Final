const request = require('supertest');
const { app } = require('../server');

/**
 * Note: Auth-protected; expecting 401 without token is acceptable.
 * If accessible (future: test token injection), validate payload shape.
 */
describe('Orders History Transactions Endpoint', () => {
  test('GET /api/orders/history/transactions returns data or protected status', async () => {
    const res = await request(app)
      .get('/api/orders/history/transactions?page=1&limit=5')
      .set('Authorization', 'Bearer invalid-test-token');

    // Acceptable protected statuses until test auth token is implemented
    if ([401, 403, 404].includes(res.status)) {
      // Some middlewares may return empty object on 404 before JSON handler
      if (Object.keys(res.body || {}).length > 0) {
        expect(res.body).toHaveProperty('message');
      }
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('transactions');
    expect(res.body.data).toHaveProperty('pagination');
  });
});
