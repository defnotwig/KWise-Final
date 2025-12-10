// Validate presence breakdown fields in users SSE payload
process.env.NODE_ENV = 'test';

let startServer;
beforeAll(() => {
  // Ensure our DB mock is applied before requiring server
  jest.resetModules();
  jest.doMock('../config/db', () => {
    return {
      connectDB: jest.fn(async () => true),
      closePool: jest.fn(async () => true),
      query: jest.fn(async (text) => {
        const sql = String(text).toLowerCase();
        if (sql.includes('with base as')) {
          // return structure matching presence query result
          return { rows: [{ total: 10, active_15: 7, online_2: 4 }] };
        }
        if (sql.includes('from audit_logs') && sql.includes("15 minutes")) return { rows: [{ count: '7' }] };
        if (sql.includes('from audit_logs') && sql.includes("2 minutes")) return { rows: [{ count: '4' }] };
        return { rows: [{ count: '0' }] };
      })
    };
  });
  ({ startServer } = require('../server'));
});

describe('Realtime Users SSE Presence', () => {
  let app;
  beforeAll(async () => {
    app = await startServer({ listen: false });
  });

  test('broadcastUserStats emits presence fields with valid math', async () => {
    const writes = [];
    const client = { res: { write: (chunk) => writes.push(chunk) } };
    const sse = app.get('sseClients');
    sse.users.add(client);
    const broadcast = app.get('broadcastUserStats');
    await broadcast();
    const output = writes.join('\n');
    expect(output).toContain('event: users');
    const jsonLine = output.split('\n').find(l => l.startsWith('data: ')).replace('data: ', '').trim();
    const parsed = JSON.parse(jsonLine);
    expect(parsed.totalUsers).toBe(10);
    expect(parsed.activeUsers).toBe(7);
    expect(parsed.presence).toBeDefined();
    expect(parsed.presence.online).toBe(4);
    expect(parsed.presence.away).toBe(3); // active 7 - online 4
    expect(parsed.presence.offline).toBe(3); // total 10 - active 7
    sse.users.delete(client);
  });
});
