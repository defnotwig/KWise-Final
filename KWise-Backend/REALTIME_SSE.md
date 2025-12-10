# Realtime SSE Guide

This backend exposes Server-Sent Events (SSE) channels for live updates.

## Endpoints

- GET /api/realtime/users
  - Events:
    - heartbeat: { ts }
    - users: { timestamp, totalUsers, activeUsers, presence: { online, away, offline } }
- GET /api/realtime/logs
  - Events:
    - heartbeat: { ts }
    - log-entry: { type: 'log-entry', data: AuditLogRow }
- GET /api/realtime/orders
  - Events:
    - heartbeat: { ts }
    - order-updated: { type: 'order-updated', data: OrderRow, ts }
    - order-created: { type: 'order-created', data: OrderRow, ts }
    - order-progress: { type: 'order-progress', data: { id, status?, progress?, message? }, ts }
    - order-completed: { type: 'order-completed', data: OrderRow, ts }
    - order-cancelled: { type: 'order-cancelled', data: OrderRow, ts }

## Payloads

- OrderRow: { id, order_number, customer_name, customer_email, total_amount, payment_method, payment_status, status, created_at, updated_at }
- AuditLogRow: { id, user_id?, user_name?, user_role?, action, table_name?, record_id?, description, severity, created_at }

## Emission Helpers (utils/ordersSseHelper.js)

- emitOrderEvent(app, { type, data })
- emitOrderCreated(app, orderRow)
- emitOrderProgress(app, { id, status?, progress?, message? })
- emitOrderCompleted(app, orderRow)
- emitOrderCancelled(app, orderRow)

## Triggering Events (Routes)

- PATCH /api/orders/queue/:id/status (admins)
  - Emits: order-updated; and specialized order-completed / order-cancelled when applicable
- POST /api/orders/events/:id/created (developer, superadmin)
  - Emits: order-created (utility/testing)
- POST /api/orders/events/progress (admin, superadmin, developer)
  - Emits: order-progress with body { id, status?, progress?, message? }

## Client Example

const es = new EventSource('/api/realtime/orders');
es.addEventListener('order-updated', (e) => {
const payload = JSON.parse(e.data);
console.log(payload.data);
});

// Always close when no longer needed
es.close();
