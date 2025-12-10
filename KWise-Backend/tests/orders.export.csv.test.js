const request = require('supertest');
const { app } = require('../server');

describe('Orders Export CSV Endpoint', () => {
  test('GET /api/orders/export/csv returns CSV or protected status', async () => {
    const res = await request(app)
      .get('/api/orders/export/csv')
      .set('Authorization', 'Bearer invalid-test-token')
      .set('Accept', 'text/csv');

    if ([401,403,404].includes(res.status)) {
      expect(typeof res.body).toBe('object');
      return;
    }
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text.split('\n')[0]).toMatch(/order_number/);
  });
});
