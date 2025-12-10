const store = {
  orders: [],
  queues: [],
  nextOrderId: 1,
  nextQueueNumber: 1,
  parts: [],
  nextPartId: 1
};

function reset() {
  store.orders = [];
  store.queues = [];
  store.nextOrderId = 1;
  store.nextQueueNumber = 1;
  store.parts = [];
  store.nextPartId = 1;
}

function buildOrderNumber(id) {
  return `KW-TEST-${id}`;
}

function createOrder(body = {}) {
  const orderId = store.nextOrderId++;
  const queueNumber = store.nextQueueNumber++;
  const now = new Date().toISOString();
  const order = {
    id: orderId,
    order_number: buildOrderNumber(orderId),
    orderIdFormatted: buildOrderNumber(orderId),
    customer_name: body.customerName || 'Customer',
    customer_email: body.customerEmail || body.customer_email || null,
    items: body.items || [],
    total_amount: body.totalAmount || 0,
    payment_method: body.paymentMethod || 'Cash',
    payment_status: body.paymentStatus || 'paid',
    status: 'assigned',
    queue_status: 'assigned',
    assisted_by: body.assistedBy || null,
    created_at: now,
    updated_at: now
  };

  const queue = {
    queue_number: queueNumber,
    order_id: orderId,
    status: 'assigned',
    is_now_serving: false,
    now_serving_station: null,
    now_serving_set_at: null,
    now_serving_set_by: null,
    customer_name: order.customer_name,
    order_id_formatted: order.orderIdFormatted,
    created_at: now
  };

  store.orders.push(order);
  store.queues.push(queue);

  return { order, queue };
}

function createPart(body = {}) {
  const partId = store.nextPartId++;
  const item = {
    id: partId,
    name: body.name || `Part ${partId}`,
    category: body.category || 'CPU',
    brand: body.brand || 'Test Brand',
    price: parseFloat(body.price || 0),
    stock: parseInt(body.stock || 0),
    description: body.description || '',
    specifications: body.specifications ? JSON.parse(JSON.stringify(body.specifications)) : {},
    image_url: body.image_url || '/test/image.png',
    tier: body.tier || null
  };
  store.parts.push(item);
  return item;
}

function findPartById(id) {
  return store.parts.find(p => String(p.id) === String(id));
}

function updatePart(id, updates = {}) {
  const part = findPartById(id);
  if (!part) return null;
  const { specifications, ...rest } = updates;
  if (specifications) {
    part.specifications = { ...part.specifications, ...specifications };
  }
  Object.assign(part, rest);
  return part;
}

function listParts(filter = {}) {
  let parts = [...store.parts];
  if (filter.category) {
    parts = parts.filter(p => p.category === filter.category);
  }
  return parts;
}

function findQueue(queueNumber) {
  return store.queues.find(q => q.queue_number === Number(queueNumber));
}

function findOrder(orderId) {
  return store.orders.find(o => o.id === Number(orderId));
}

function assignNextPendingToStation(station) {
  const next = store.queues.find(q => q.status === 'assigned' && !q.is_now_serving);
  if (!next) return null;
  setNowServing(next.queue_number, station);
  return next;
}

function setNowServing(queueNumber, station) {
  const queue = findQueue(queueNumber);
  if (!queue) return null;

  store.queues.forEach(q => {
    if (q.now_serving_station === station) {
      q.is_now_serving = false;
      q.now_serving_station = null;
      q.now_serving_set_at = null;
    }
  });

  const now = new Date().toISOString();
  queue.is_now_serving = true;
  queue.now_serving_station = station;
  queue.now_serving_set_at = now;
  queue.status = 'processing';

  const order = findOrder(queue.order_id);
  if (order) {
    order.status = 'processing';
    order.queue_status = 'processing';
    order.updated_at = now;
  }

  return queue;
}

function updateQueueStatus(queueNumber, status, customerName) {
  const queue = findQueue(queueNumber);
  if (!queue) return { queue: null, autoAdvanced: null };

  if (status === 'completed' && (!customerName || customerName === 'Customer')) {
    return { requiresNameUpdate: true };
  }

  const now = new Date().toISOString();
  queue.status = status;
  queue.is_now_serving = false;
  const station = queue.now_serving_station;
  queue.now_serving_station = null;
  queue.now_serving_set_at = null;
  if (customerName) queue.customer_name = customerName;

  const order = findOrder(queue.order_id);
  if (order) {
    order.status = status;
    order.queue_status = status;
    if (customerName) order.customer_name = customerName;
    order.updated_at = now;
  }

  const shouldAutoAdvance = station && store.queues.length >= 3;
  const autoAdvanced = shouldAutoAdvance ? assignNextPendingToStation(station) : null;
  return { queue, autoAdvanced };
}

function updateCustomer(queueNumber, customerName) {
  const queue = findQueue(queueNumber);
  if (!queue) return null;
  queue.customer_name = customerName;

  const order = findOrder(queue.order_id);
  if (order) {
    order.customer_name = customerName;
    order.updated_at = new Date().toISOString();
  }

  return { queue, order };
}

function getNowServing() {
  const station1 = store.queues.find(q => q.is_now_serving && q.now_serving_station === 1) || null;
  const station2 = store.queues.find(q => q.is_now_serving && q.now_serving_station === 2) || null;
  return { station1, station2 };
}

function getTransactions(query = {}) {
  const page = Math.max(parseInt(query.page || 1, 10), 1);
  const limit = Math.max(Math.min(parseInt(query.limit || 20, 10), 50), 1);
  const start = (page - 1) * limit;
  const assistedBy = query.assistedBy ? Number(query.assistedBy) : null;

  let transactions = [...store.orders];
  if (assistedBy !== null) {
    transactions = transactions.filter(t => t.assisted_by === assistedBy);
  }

  const paged = transactions.slice(start, start + limit).map(t => ({
    ...t,
    order_id_formatted: t.orderIdFormatted || buildOrderNumber(t.id)
  }));

  return {
    transactions: paged,
    pagination: {
      currentPage: page,
      totalPages: Math.max(Math.ceil(transactions.length / limit), 1),
      totalItems: transactions.length,
      itemsPerPage: limit
    }
  };
}

module.exports = {
  store,
  reset,
  createOrder,
  setNowServing,
  updateQueueStatus,
  updateCustomer,
  getNowServing,
  getTransactions,
  createPart,
  updatePart,
  findPartById,
  listParts
};
