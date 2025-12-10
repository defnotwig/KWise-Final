const pool = require('./config/db');

async function checkB550M() {
  try {
    const result = await pool.query(`
      SELECT name, specifications 
      FROM pc_parts 
      WHERE name = 'AORUS ELITE B550M AX'
      LIMIT 1
    `);
    
    console.log('📦 B550M MOTHERBOARD SPECIFICATIONS:');
    result.rows.forEach(row => {
      console.log(`\n🔧 ${row.name}`);
      console.log('Memory Type:', row.specifications?.memory_type);
      console.log('RAM Type:', row.specifications?.ram_type);
      console.log('DDR:', row.specifications?.ddr);
      console.log('Full specs:', JSON.stringify(row.specifications, null, 2));
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkB550M();
