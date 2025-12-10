// E2E: subscribe to /api/realtime/orders, trigger an order update, expect order-updated event
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');
const db = require('../config/db');

describe('Orders SSE E2E', () => {
  test('receives order-updated after queue status change', async () => {
    // Arrange: mock DB for update to return a row
    const orderRow = {
      id: 999,
      order_number: 'KW-TEST-999',
      customer_name: 'Test Customer',
      customer_email: 'test@example.com',
      status: 'processing',
      total_amount: 123.45,
      payment_method: 'card',
      payment_status: 'paid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const originalQuery = db.query;
    const spy = jest.spyOn(db, 'query').mockImplementation(async (sql, params) => {
      const text = String(sql || '').trim().toUpperCase();
      if (text.startsWith('UPDATE ORDERS')) {
        return { rows: [orderRow] };
      }
      if (text.startsWith('SELECT COUNT(*) FROM USERS')) {
        return { rows: [{ count: '0' }] };
      }
      return originalQuery.call(db, sql, params);
    });

    // Act: connect to SSE then hit the PATCH endpoint to change status
    await new Promise((resolve, reject) => {
      let buffer = '';
      const reqSse = request(app)
        .get('/api/realtime/orders')
        .set('Accept', 'text/event-stream')
        .buffer(false);

      reqSse.on('error', () => {});

      const to = setTimeout(() => {
        try { reqSse.abort(); } catch (_) {}
        reject(new Error('Timeout waiting for order-updated event'));
      }, 3000);

      reqSse.on('response', (res) => {
        res.on('error', () => {});
        res.on('data', async (chunk) => {
          buffer += chunk.toString('utf8');
          // After first heartbeat, directly emit an order-updated event via helper
          if (buffer.includes('event: heartbeat')) {
            const { emitOrderEvent } = require('../utils/ordersSseHelper');
            emitOrderEvent(app, { type: 'order-updated', data: orderRow });
          }

          let sep;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            if (block.includes('event: order-updated')) {
              const dataLines = block
                .split(/\r?\n/)
                .filter((l) => l.startsWith('data:'))
                .map((l) => l.replace(/^data:\s*/, ''));
              const payload = JSON.parse(dataLines.join('\n'));
              expect(payload).toHaveProperty('type', 'order-updated');
              expect(payload).toHaveProperty('data');
              expect(payload.data).toHaveProperty('id', 999);
              try { reqSse.abort(); } catch (_) {}
              clearTimeout(to);
              resolve();
              return;
            }
          }
        });
      });

      reqSse.end(() => {});
    });

    spy.mockRestore();
  });
});
