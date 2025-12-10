// End-to-end SSE test: subscribe to /api/realtime/logs, insert an audit log, assert event
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const db = require('../config/db');
const { insertAuditLog } = require('../utils/auditLogHelper');

describe('Logs SSE E2E', () => {
  test('receives log-entry event after insertAuditLog', async () => {
    // Prepare a deterministic row to be returned by the DB mock on insert
    const expected = {
      id: 123,
      action: 'E2E_SSE_TEST',
      description: 'End-to-end SSE log test',
      severity: 'INFO',
      created_at: new Date().toISOString()
    };

    // Spy on db.query to return our expected row for the insert
    const originalQuery = db.query;
    const querySpy = jest.spyOn(db, 'query').mockImplementation(async (sql, values) => {
      const text = String(sql || '');
      if (/^\s*INSERT\s+INTO\s+audit_logs/i.test(text)) {
        // Basic shape: return expected row
        return { rows: [expected] };
      }
      // Fall back to the original (stub) implementation for anything else
      return originalQuery.call(db, sql, values);
    });

    // Subscribe to SSE endpoint and wait for the log-entry event
    await new Promise((resolve, reject) => {
      let buffer = '';
      let inserted = false;
      const req = request(app)
        .get('/api/realtime/logs')
        .set('Accept', 'text/event-stream')
        .buffer(false);

      // Swallow abort errors to avoid unhandled ECONNRESET when we close the stream
      req.on('error', () => {});

      // Safety timeout to fail fast if event not received
      const to = setTimeout(() => {
        try { req.abort(); } catch(_) {}
        reject(new Error('Timed out waiting for log-entry event'));
      }, 3000);

      req.on('response', (res) => {
        res.on('error', () => {});
        res.on('data', async (buf) => {
          try {
            buffer += buf.toString('utf8');
            // Trigger the insert after seeing the initial heartbeat
            if (!inserted && buffer.includes('event: heartbeat')) {
              inserted = true;
              await insertAuditLog(app, {
                action: expected.action,
                description: expected.description,
                severity: expected.severity
              });
            }
            // Process complete SSE events separated by blank lines
            let sep;
            while ((sep = buffer.indexOf('\n\n')) !== -1) {
              const block = buffer.slice(0, sep);
              buffer = buffer.slice(sep + 2);
              if (block.includes('event: log-entry')) {
                // Concatenate all data: lines to support multi-line payloads
                const dataLines = block
                  .split(/\r?\n/)
                  .filter((l) => l.startsWith('data:'))
                  .map((l) => l.replace(/^data:\s*/, ''));
                let payload;
                try {
                  payload = JSON.parse(dataLines.join('\n'));
                } catch (parseErr) {
                  throw new Error(`Failed to parse SSE payload: ${parseErr.message}\nBlock=\n${block}`);
                }
                // Validate expected payload shape
                expect(payload).toBeDefined();
                expect(payload.type).toBe('log-entry');
                expect(payload.data).toBeDefined();
                expect(payload.data.action).toBe(expected.action);
                expect(payload.data.severity).toBe(expected.severity);
                // Abort the streaming request to avoid open handles
                req.abort();
                clearTimeout(to);
                resolve();
                return;
              }
            }
          } catch (e) {
            try { req.abort(); } catch(_) {}
            clearTimeout(to);
            reject(e);
          }
        });
      });

      // Start the request (will remain open until aborted)
      req.end(() => {});
    });

  // Cleanup spy
    querySpy.mockRestore();
  });
});
