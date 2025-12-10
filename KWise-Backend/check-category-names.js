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
    const res = await pool.query(`SELECT DISTINCT category FROM pc_parts ORDER BY category`);
    console.log('📋 All categories in database:');
    res.rows.forEach((row, i) => {
      console.log(`   ${i+1}. "${row.category}"`);
    });

    // Check category that Builder API uses
    console.log('\n🔍 Checking Builder API category names:');
    const cpuCheck = await pool.query(`SELECT COUNT(*) FROM pc_parts WHERE category = 'CPU' AND is_active = true`);
    console.log(`   "CPU": ${cpuCheck.rows[0].count} products`);

    const coolingCheck = await pool.query(`SELECT COUNT(*) FROM pc_parts WHERE category = 'Cooling' AND is_active = true`);
    console.log(`   "Cooling": ${coolingCheck.rows[0].count} products`);

    const motherboardCheck = await pool.query(`SELECT COUNT(*) FROM pc_parts WHERE category = 'Motherboard' AND is_active = true`);
    console.log(`   "Motherboard": ${motherboardCheck.rows[0].count} products`);

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
  }
})();
