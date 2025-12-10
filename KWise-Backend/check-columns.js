const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

(async () => {
  try {
    // Get all column names
    const columns = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pc_parts' ORDER BY ordinal_position`
    );
    
    console.log('📋 pc_parts table columns:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type})`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
