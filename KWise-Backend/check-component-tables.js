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
    console.log('🔍 Checking component tables...\n');

    const tables = ['cpu', 'cooling', 'motherboard', 'ram', 'storage', 'gpu', 'pc_case', 'psu'];

    for (const table of tables) {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`✅ ${table}: ${res.rows[0].count} rows`);
    }

    console.log('\n📋 Checking CPU table columns:');
    const cpuColumns = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'cpu' 
      ORDER BY ordinal_position
    `);
    console.log('   Columns:', cpuColumns.rows.map(r => r.column_name).join(', '));

    console.log('\n📋 Sample CPU data:');
    const cpuSample = await pool.query(`SELECT * FROM cpu LIMIT 2`);
    cpuSample.rows.forEach(row => {
      console.log(`   ID:${row.id} | Name:${row.name} | Socket:${row.socket} | Cores:${row.cores}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
  }
})();
