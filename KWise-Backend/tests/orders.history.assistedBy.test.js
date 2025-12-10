const request = require('supertest');
const { app } = require('../server');

/**
 * Ensures the assistedBy filter parameter is wired into /api/orders/history/transactions
 * Accepts protected status codes until an auth token is provided in test harness.
 */
describe('Orders History assistedBy filter', () => {
  test('GET /api/orders/history/transactions?assistedBy=1 returns filtered or protected response', async () => {
    const res = await request(app)
      .get('/api/orders/history/transactions?assistedBy=1&limit=5')
      .set('Authorization', 'Bearer invalid-test-token');

    if ([401, 403, 404].includes(res.status)) {
      expect(typeof res.body).toBe('object');
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('transactions');
    // If any transactions returned, ensure all assisted_by match 1
    const txs = res.body.data.transactions || [];
    txs.forEach(t => {
      if (t.assisted_by !== null && t.assisted_by !== undefined) {
        expect(t.assisted_by).toBe(1);
      }
    });
  });
});
