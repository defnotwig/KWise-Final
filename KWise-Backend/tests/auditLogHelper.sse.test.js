// Unit-style test for SSE emission inside insertAuditLog without touching real DB
process.env.NODE_ENV = 'test';

// Ensure a fresh module registry so our mock replaces any cached module loaded in setup
beforeAll(() => {
  jest.resetModules();
  jest.doMock('../config/db', () => {
    return {
      query: jest.fn((sql, values) => {
        const row = {
          id: 1,
          action: values?.[0],
          description: values?.[1] || '',
          severity: (values?.[2] || 'INFO'),
          created_at: new Date().toISOString()
        };
        return Promise.resolve({ rows: [row] });
      })
    };
  });
});

let insertAuditLog;
beforeAll(() => {
  // Require after mocking
  ({ insertAuditLog } = require('../utils/auditLogHelper'));
});

describe('auditLogHelper SSE emission', () => {
  test('broadcasts log-entry event when clients connected', async () => {
    const writes = [];
    const fakeClient = { res: { write: (chunk) => writes.push(chunk) } };
    const sseClients = { logs: new Set([fakeClient]) };
    const fakeApp = { get: (key) => key === 'sseClients' ? sseClients : undefined };

  const row = await insertAuditLog(fakeApp, { action: 'TEST_EVENT', entity: 'test', severity: 'info', description: 'SSE test' });
    expect(row.action).toBe('TEST_EVENT');
    const combined = writes.join('\n');
    expect(combined).toContain('event: log-entry');
    expect(combined).toContain('TEST_EVENT');
    expect(combined).toContain('"severity":"INFO"');
  });
});
