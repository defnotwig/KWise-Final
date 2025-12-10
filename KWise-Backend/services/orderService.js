// services/orderService.js
const { Pool } = require('pg');
const pool = new Pool();

const createOrder = async (userId, status) => {
const result = await pool.query(
    'INSERT INTO orders (user_id, status) VALUES ($1, $2) RETURNING *',
    [userId, status]
);
    return result.rows[0];
};

const updateOrderStatus = async (orderId, status) => {
const result = await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
    [status, orderId]
);
    return result.rows[0];
};

module.exports = { createOrder, updateOrderStatus };
