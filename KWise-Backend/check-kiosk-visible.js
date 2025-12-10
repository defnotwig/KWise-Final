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
    console.log('🔍 Checking kiosk_visible status...\n');

    // Check CPU products
    const cpuTotal = await pool.query(`SELECT COUNT(*) FROM cpu`);
    console.log(`📊 Total CPUs in cpu table: ${cpuTotal.rows[0].count}`);

    const cpuInParts = await pool.query(`
      SELECT COUNT(*) 
      FROM cpu c
      INNER JOIN pc_parts p ON p.id = c.id AND p.category = 'CPU'
    `);
    console.log(`📊 CPUs with matching pc_parts entry: ${cpuInParts.rows[0].count}`);

    const cpuActive = await pool.query(`
      SELECT COUNT(*) 
      FROM cpu c
      INNER JOIN pc_parts p ON p.id = c.id AND p.category = 'CPU'
      WHERE p.is_active = true
    `);
    console.log(`✅ CPUs with is_active=true: ${cpuActive.rows[0].count}`);

    const cpuKiosk = await pool.query(`
      SELECT COUNT(*) 
      FROM cpu c
      INNER JOIN pc_parts p ON p.id = c.id AND p.category = 'CPU'
      WHERE p.is_active = true AND p.kiosk_visible = true
    `);
    console.log(`✅ CPUs with kiosk_visible=true: ${cpuKiosk.rows[0].count}`);

    // Check kiosk_visible column in pc_parts
    console.log('\n📋 Sample pc_parts entries for CPU:');
    const sample = await pool.query(`
      SELECT id, name, category, is_active, kiosk_visible
      FROM pc_parts
      WHERE category = 'CPU'
      LIMIT 5
    `);
    sample.rows.forEach(row => {
      console.log(`   ID:${row.id} | ${row.name} | Active:${row.is_active} | Kiosk:${row.kiosk_visible}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    await pool.end();
  }
})();
