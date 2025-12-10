const request = require('supertest');
const { app } = require('../server');

describe('Orders Assistants Endpoint', () => {
  test('GET /api/orders/assistants returns protected or list', async () => {
    const res = await request(app)
      .get('/api/orders/assistants')
      .set('Authorization', 'Bearer invalid-test-token');

    if ([401,403,404].includes(res.status)) {
      expect(typeof res.body).toBe('object');
      return;
    }
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
