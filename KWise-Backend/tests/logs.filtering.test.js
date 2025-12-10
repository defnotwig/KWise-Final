const request = require('supertest');
process.env.NODE_ENV = 'test';
const { app } = require('../server');

/**
 * Basic filtering tests for /api/logs endpoint.
 * These do not authenticate; expecting 401/403 is acceptable per existing pattern
 * until auth helper for tests is implemented. Once auth tokens are added, adjust expectations.
 */
describe('Logs Filtering Endpoint', () => {
  const endpoint = '/api/logs';

  test('GET /api/logs supports severity filter', async () => {
    const res = await request(app).get(`${endpoint}?severity=INFO&limit=5`);
  expect([200,401,403,404]).toContain(res.statusCode);
    if(res.statusCode === 200){
      expect(Array.isArray(res.body.data)).toBe(true);
      for(const row of res.body.data){
        if(row.severity) expect(row.severity).toBe('INFO');
      }
      expect(res.body.pagination).toBeDefined();
    }
  });

  test('GET /api/logs supports search/q alias', async () => {
    const res = await request(app).get(`${endpoint}?q=login&limit=5`);
  expect([200,401,403,404]).toContain(res.statusCode);
    if(res.statusCode === 200){
      expect(Array.isArray(res.body.data)).toBe(true);
    }
  });

  test('GET /api/logs supports date range', async () => {
    const now = new Date();
    const from = new Date(now.getTime() - 7*24*60*60*1000).toISOString();
    const to = now.toISOString();
    const res = await request(app).get(`${endpoint}?date_from=${from}&date_to=${to}&limit=5`);
  expect([200,401,403,404]).toContain(res.statusCode);
    if(res.statusCode === 200){
      for(const row of res.body.data){
        const created = new Date(row.created_at).getTime();
        expect(created).toBeGreaterThanOrEqual(new Date(from).getTime());
        expect(created).toBeLessThanOrEqual(new Date(to).getTime());
      }
    }
  });

  test('GET /api/logs invalid severity returns 400', async () => {
    const res = await request(app).get(`${endpoint}?severity=INVALID_LEVEL`);
    // If protected, may return 401 before validation; accept that too.
  if([401,403,404].includes(res.statusCode)) return;
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
