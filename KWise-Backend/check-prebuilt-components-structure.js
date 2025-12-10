require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'KWiseDB',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'humbleludwig13'
});

async function checkTables() {
  try {
    // Check prebuilt_components columns
    const componentsColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prebuilt_components'
      ORDER BY ordinal_position
    `);
    
    console.log('🏗️  Prebuilt Components Table Columns:');
    console.table(componentsColumns.rows);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
