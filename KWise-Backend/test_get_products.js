const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function getProducts() {
  try {
    const result = await pool.query(`
      SELECT id, product_name, category, specifications 
      FROM pc_parts 
      WHERE category IN ('CPU', 'Motherboard', 'RAM', 'GPU', 'Case')
      AND status = 'active'
      LIMIT 10
    `);
    
    console.log('📦 Sample Products:');
    result.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.product_name} (${row.category})`);
    });
    
    return result.rows;
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getProducts();
