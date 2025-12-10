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
    console.log('🔍 Checking database product counts...\n');

    const res1 = await pool.query(
      `SELECT COUNT(*) FROM pc_parts WHERE category = 'Central Processing Unit' AND is_active = true`
    );
    console.log('✅ CPUs in database:', res1.rows[0].count);

    const res2 = await pool.query(
      `SELECT COUNT(*) FROM pc_parts WHERE category = 'Cooling System' AND is_active = true`
    );
    console.log('✅ Cooling products in database:', res2.rows[0].count);

    const res3 = await pool.query(
      `SELECT COUNT(*) FROM pc_parts WHERE category = 'Cooling System' AND compatible_sockets IS NOT NULL AND is_active = true`
    );
    console.log('✅ Cooling products with socket data:', res3.rows[0].count);

    const res4 = await pool.query(
      `SELECT COUNT(*) FROM pc_parts WHERE category = 'Cooling System' AND compatible_sockets @> '["AM4"]' AND is_active = true`
    );
    console.log('✅ Cooling products compatible with AM4:', res4.rows[0].count);

    console.log('\n✅ Database has products and compatibility data!');
    await pool.end();
  } catch (err) {
    console.error('❌ Database error:', err.message);
    await pool.end();
  }
})();
