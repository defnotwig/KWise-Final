const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function checkCoolingLocation() {
  try {
    // Check pc_parts table
    const pcPartsCount = await pool.query(`
      SELECT COUNT(*) as total FROM pc_parts WHERE category = 'Cooling'
    `);
    
    console.log(`PC_PARTS Cooling count: ${pcPartsCount.rows[0].total}`);
    
    // Check cooling table
    const coolingCount = await pool.query(`
      SELECT COUNT(*) as total FROM cooling
    `);
    
    console.log(`COOLING table count: ${coolingCount.rows[0].total}`);
    
    // Sample from pc_parts cooling
    if (parseInt(pcPartsCount.rows[0].total) > 0) {
      const sample = await pool.query(`
        SELECT id, name, specifications FROM pc_parts 
        WHERE category = 'Cooling' 
        LIMIT 3
      `);
      console.log('\n=== SAMPLE FROM PC_PARTS ===');
      console.log(JSON.stringify(sample.rows, null, 2));
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkCoolingLocation();
