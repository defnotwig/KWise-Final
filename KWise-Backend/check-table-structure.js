const { pool } = require('./config/db');

async function checkStructure() {
  try {
    console.log('=== PC_PARTS TABLE STRUCTURE ===\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pc_parts' 
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n=== SAMPLE MOTHERBOARD DATA ===\n');
    
    const sampleData = await pool.query(`
      SELECT * FROM pc_parts 
      WHERE category = 'motherboard' 
      LIMIT 1
    `);
    
    if (sampleData.rows.length > 0) {
      console.log(JSON.stringify(sampleData.rows[0], null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStructure();
