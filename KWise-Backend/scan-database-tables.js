const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost', 
  database: process.env.DB_NAME || 'KWiseDB',
  password: process.env.DB_PASSWORD || 'humbleludwig13',
  port: process.env.DB_PORT || 5432
});

async function scanTables() {
  try {
    const categories = ['cpu', 'gpu', 'ram', 'motherboard', 'psu', 'storage', 'pc_case', 'cooling', 'headphones', 'keyboard', 'monitor', 'mouse', 'speakers', 'webcam'];
    
    for (const table of categories) {
      console.log('='.repeat(50));
      console.log(`Table: ${table.toUpperCase()}`);
      console.log('='.repeat(50));
      
      try {
        const result = await pool.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [table]);
        
        if (result.rows.length > 0) {
          result.rows.forEach(row => {
            console.log(`📋 ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
          });
        } else {
          console.log('❌ Table does not exist');
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
      console.log('');
    }
    
    await pool.end();
  } catch (error) {
    console.error(`❌ Database error: ${error.message}`);
  }
}

scanTables();