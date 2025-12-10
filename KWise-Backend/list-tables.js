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
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
      ORDER BY table_name
    `);
    
    console.log('📋 Tables in KWiseDB:');
    res.rows.forEach((row, i) => {
      console.log(`   ${i+1}. ${row.table_name}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
  }
})();
