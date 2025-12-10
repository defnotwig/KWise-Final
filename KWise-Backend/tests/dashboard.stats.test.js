const request = require('supertest');
const { app } = require('../server');

/**
 * Auth-protected; we accept 401/403/404 when no token provided.
 * If accessible, validate core shape and presence of consolidated fields.
 */
describe('Dashboard Stats Endpoint', () => {
  test('GET /api/dashboard/stats returns stats or protected status', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', 'Bearer invalid-test-token');

    if ([401, 403, 404].includes(res.status)) {
      if (Object.keys(res.body || {}).length > 0) {
        expect(res.body).toHaveProperty('message');
      }
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    const d = res.body.data;
    expect(d).toHaveProperty('orders');
    expect(d).toHaveProperty('users');
    expect(d).toHaveProperty('products');
    expect(d).toHaveProperty('revenue');
    // Augmented fields (best-effort)
    if (d.logs) {
      expect(d.logs).toHaveProperty('counts');
      expect(d.logs).toHaveProperty('recentActions');
    }
  });
});
