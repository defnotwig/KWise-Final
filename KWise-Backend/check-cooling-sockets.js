const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function checkCoolingSockets() {
  try {
    // Find cooling products with socket info in names
    const result = await pool.query(`
      SELECT id, name 
      FROM cooling 
      WHERE name ILIKE '%AM4%' OR name ILIKE '%AM5%' 
         OR name ILIKE '%LGA%' OR name ILIKE '%1700%' 
         OR name ILIKE '%1200%' OR name ILIKE '%1151%'
      ORDER BY name
      LIMIT 20
    `);
    
    console.log('\n=== COOLING PRODUCTS WITH SOCKET INFO ===\n');
    result.rows.forEach(row => {
      console.log(`${row.id}: ${row.name}`);
    });
    
    console.log(`\n\nTotal found: ${result.rows.length}`);
    
    // Get total cooling products
    const total = await pool.query('SELECT COUNT(*) FROM cooling');
    console.log(`Total cooling products: ${total.rows[0].count}`);
    
    // Check if there are products with multiple socket support
    const multi = await pool.query(`
      SELECT id, name 
      FROM cooling 
      WHERE (name ILIKE '%AM4%' AND name ILIKE '%AM5%')
         OR (name ILIKE '%LGA%' AND name ILIKE '%AM%')
      LIMIT 10
    `);
    
    console.log('\n\n=== MULTI-SOCKET COOLING PRODUCTS ===\n');
    multi.rows.forEach(row => {
      console.log(`${row.id}: ${row.name}`);
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkCoolingSockets();
