// services/userService.js
const { Pool } = require('pg');
const pool = new Pool();

const getAllUsers = async () => {
const result = await pool.query('SELECT * FROM users');
    return result.rows;
};

const updateUserProfile = async (userId, name, email, role) => {
const result = await pool.query(
    'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
    [name, email, role, userId]
);
    return result.rows[0];
};

module.exports = { getAllUsers, updateUserProfile };
