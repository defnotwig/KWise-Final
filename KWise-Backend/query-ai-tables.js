const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'KWiseDB',
  user: 'postgres',
  password: 'humbleludwig13'
});

async function queryAITables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%ai%' 
        OR table_name LIKE '%compat%' 
        OR table_name LIKE '%upgrade%')
      ORDER BY table_name
    `);
    
    console.log('\n📊 AI-RELATED DATABASE TABLES:\n');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });
    console.log(`\n📈 Total AI tables found: ${result.rows.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

queryAITables();
