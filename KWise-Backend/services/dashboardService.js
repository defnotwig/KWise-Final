// services/dashboardService.js
const { Pool } = require('pg');
const pool = new Pool();

const getDashboardSummary = async () => {
const userCount = await pool.query('SELECT COUNT(*) FROM users');
const orderCount = await pool.query('SELECT COUNT(*) FROM orders');
return {
    userCount: userCount.rows[0].count,
    orderCount: orderCount.rows[0].count,
    };
};

module.exports = { getDashboardSummary };
