const logger = require('./logger');

/**
 * Emit an SSE event to all connected orders clients.
 * @param {import('express').Express} app
 * @param {{ type: string, data: any }} payload
 */
function emitOrderEvent(app, { type, data }) {
  try {
    if (!type) throw new Error('Missing event type');
    const sse = app.get('sseClients');
    if (!sse?.orders?.size) return 0;
    const msg = JSON.stringify({ type, data, ts: new Date().toISOString() });
    let count = 0;
    sse.orders.forEach(c => {
      try {
        c.res.write(`event: ${type}\n`);
        c.res.write(`data: ${msg}\n\n`);
        count++;
      } catch (e) {
        // ignore individual client errors
      }
    });
    return count;
  } catch (e) {
    logger.warn('emitOrderEvent failed:', e.message);
    return 0;
  }
}

// Convenience wrappers for common events
function emitOrderCreated(app, order) {
  return emitOrderEvent(app, { type: 'order-created', data: order });
}
function emitOrderProgress(app, payload) {
  // payload can include { id, status, progress, message }
  return emitOrderEvent(app, { type: 'order-progress', data: payload });
}
function emitOrderCompleted(app, order) {
  return emitOrderEvent(app, { type: 'order-completed', data: order });
}
function emitOrderCancelled(app, order) {
  return emitOrderEvent(app, { type: 'order-cancelled', data: order });
}

module.exports = { 
  emitOrderEvent,
  emitOrderCreated,
  emitOrderProgress,
  emitOrderCompleted,
  emitOrderCancelled
};
