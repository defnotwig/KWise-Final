// Check database schema for pc_parts table
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkSchema() {
  try {
    const query = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts'
      ORDER BY ordinal_position
    `;
    
    const result = await pool.query(query);
    console.log('📋 pc_parts table columns:\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    
    // Get sample record
    console.log('\n\n📦 Sample Pre-Built record:\n');
    const sample = await pool.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'Pre-Built' 
      LIMIT 1
    `);
    
    if (sample.rows.length > 0) {
      console.log(JSON.stringify(sample.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
