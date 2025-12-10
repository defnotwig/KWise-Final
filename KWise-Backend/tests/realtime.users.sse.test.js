// Test user stats SSE broadcast formatting using mocked DB
process.env.NODE_ENV = 'test';

// Mock DB before server import so server uses stub
jest.mock('../config/db', () => ({
  connectDB: jest.fn(async () => true),
  closePool: jest.fn(async () => true),
  query: jest.fn(async (text) => {
    const sql = String(text).toLowerCase();
    if (sql.includes('with base as')) {
      return { rows: [{ total: 7, active_15: 3, online_2: 2 }] };
    }
    if (sql.includes('from audit_logs') && sql.includes('15 minutes')) return { rows: [{ count: '3' }] };
    if (sql.includes('from audit_logs') && sql.includes('2 minutes')) return { rows: [{ count: '2' }] };
    return { rows: [{ count: '0' }] };
  })
}));

const { startServer } = require('../server');

describe('Realtime Users SSE', () => {
  let app;
  beforeAll(async () => {
    app = await startServer({ listen: false });
  });

  test('broadcastUserStats emits users event with counts', async () => {
  const writes = [];
    const client = { res: { write: (chunk) => writes.push(chunk) } };
    const sse = app.get('sseClients');
    sse.users.add(client);
    const broadcast = app.get('broadcastUserStats');
    await broadcast();
    const output = writes.join('\n');
    expect(output).toContain('event: users');
  // Extract JSON line
  const jsonLine = output.split('\n').find(l => l.startsWith('data: ')).replace('data: ', '').trim();
  const parsed = JSON.parse(jsonLine);
  expect(typeof parsed.totalUsers).toBe('number');
  expect(typeof parsed.activeUsers).toBe('number');
  expect(parsed.totalUsers).toBeGreaterThanOrEqual(0);
  expect(parsed.activeUsers).toBeGreaterThanOrEqual(0);
    sse.users.delete(client);
  });
});
