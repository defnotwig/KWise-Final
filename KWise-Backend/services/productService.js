// services/productService.js
const { Pool } = require('pg');
const pool = new Pool();

const getAllProducts = async () => {
const result = await pool.query('SELECT * FROM products');
    return result.rows;
};

const updateProduct = async (productId, name, description, price, stockQuantity) => {
const result = await pool.query(
    'UPDATE products SET name = $1, description = $2, price = $3, stock_quantity = $4 WHERE id = $5 RETURNING *',
    [name, description, price, stockQuantity, productId]
);
    return result.rows[0];
};

module.exports = { getAllProducts, updateProduct };
