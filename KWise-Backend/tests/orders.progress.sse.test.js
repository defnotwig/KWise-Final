// E2E-lite: subscribe to /api/realtime/orders and emit an order-progress event, assert reception
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { app } = require('../server');

describe('Orders SSE progress', () => {
  test('receives order-progress event payload', async () => {
    await new Promise((resolve, reject) => {
      let buffer = '';
      const payload = { id: 321, status: 'processing', progress: 42, message: 'Working' };

      const reqSse = request(app)
        .get('/api/realtime/orders')
        .set('Accept', 'text/event-stream')
        .buffer(false);

      reqSse.on('error', () => {});

      const to = setTimeout(() => {
        try { reqSse.abort(); } catch (cleanupErr) { console.debug('SSE abort cleanup:', cleanupErr.message); }
        reject(new Error('Timeout waiting for order-progress event'));
      }, 2500);

      reqSse.on('response', (res) => {
        res.on('error', () => {});
        res.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
          if (buffer.includes('event: heartbeat')) {
            const { emitOrderProgress } = require('../utils/ordersSseHelper');
            emitOrderProgress(app, payload);
          }
          let sep;
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            if (block.includes('event: order-progress')) {
              const dataLines = block
                .split(/\r?\n/)
                .filter((l) => l.startsWith('data:'))
                .map((l) => l.replace(/^data:\s*/, ''));
              const got = JSON.parse(dataLines.join('\n'));
              expect(got).toHaveProperty('type', 'order-progress');
              expect(got).toHaveProperty('data');
              expect(got.data).toMatchObject(payload);
              try { reqSse.abort(); } catch (cleanupErr) { console.debug('SSE abort cleanup:', cleanupErr.message); }
              clearTimeout(to);
              resolve();
              return;
            }
          }
        });
      });

      reqSse.end(() => {});
    });
  });
});
