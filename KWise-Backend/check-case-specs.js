const pool = require('./config/db');

async function checkCaseSpecs() {
  try {
    const result = await pool.query(`
      SELECT id, name, specifications 
      FROM pc_parts 
      WHERE category = 'case' 
      LIMIT 3
    `);
    
    console.log('📦 PC CASE SPECIFICATIONS:');
    result.rows.forEach(row => {
      console.log(`\n🔧 ${row.name} (ID: ${row.id})`);
      console.log('Specifications:', JSON.stringify(row.specifications, null, 2));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCaseSpecs();
