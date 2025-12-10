const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST, 
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function checkTable() {
  try {
    const result = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'specification_schemas'");
    console.log('specification_schemas table structure:');
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    const data = await pool.query('SELECT * FROM specification_schemas ORDER BY category, field_name LIMIT 20');
    console.log('\nSample data:');
    data.rows.forEach(row => console.log(row));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkTable();