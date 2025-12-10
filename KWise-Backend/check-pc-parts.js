const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'KWiseDB',
  password: 'humbleludwig13',
  port: 5432
});

async function checkPcParts() {
  try {
    // Check pc_parts structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== PC_PARTS TABLE COLUMNS ===\n');
    columns.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    // Get a cooling product from pc_parts
    const cooling = await pool.query(`
      SELECT * FROM pc_parts WHERE category='cooling' LIMIT 1
    `);
    
    console.log('\n\n=== SAMPLE COOLING PRODUCT FROM PC_PARTS ===\n');
    if (cooling.rows.length > 0) {
      console.log(JSON.stringify(cooling.rows[0], null, 2));
    } else {
      console.log('No cooling products found in pc_parts table');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkPcParts();
