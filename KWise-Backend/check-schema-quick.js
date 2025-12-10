const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      ORDER BY ordinal_position
    `);

    console.log('pc_parts table columns:');
    result.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
