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
    console.log('🔍 Comprehensive database check...\n');

    // Check if table exists
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pc_parts')`
    );
    console.log('✅ pc_parts table exists:', tableCheck.rows[0].exists);

    // Total count
    const total = await pool.query(`SELECT COUNT(*) FROM pc_parts`);
    console.log('📊 Total rows in pc_parts:', total.rows[0].count);

    // Active count
    const active = await pool.query(`SELECT COUNT(*) FROM pc_parts WHERE is_active = true`);
    console.log('✅ Active products:', active.rows[0].count);

    // Check categories
    const categories = await pool.query(
      `SELECT category, COUNT(*) as count FROM pc_parts GROUP BY category ORDER BY count DESC`
    );
    console.log('\n📋 Products by category:');
    categories.rows.forEach(row => {
      console.log(`   ${row.category}: ${row.count}`);
    });

    // Check for socket compatibility field
    const socketCheck = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pc_parts' AND column_name = 'compatible_sockets'`
    );
    console.log('\n🔍 compatible_sockets column:', socketCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');

    // Sample data
    const sample = await pool.query(
      `SELECT id, brand, model, category, is_active, compatible_sockets FROM pc_parts LIMIT 5`
    );
    console.log('\n📦 Sample products:');
    sample.rows.forEach(row => {
      console.log(`   ID:${row.id} | ${row.brand} ${row.model} | ${row.category} | Active:${row.is_active} | Sockets:${JSON.stringify(row.compatible_sockets)}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
})();
