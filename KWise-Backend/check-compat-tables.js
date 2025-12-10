require('dotenv').config();
const db = require('./config/db');

async function checkTables() {
  try {
    // Check motherboard_compatibility
    const mbCompat = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'motherboard_compatibility' 
      ORDER BY ordinal_position
    `);
    console.log('\n=== motherboard_compatibility columns ===');
    console.log(mbCompat.rows.map(r => r.column_name).join(', '));
    
    // Check if cooler_compatibility exists
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%compatibility%'
      ORDER BY table_name
    `);
    console.log('\n=== Compatibility tables ===');
    tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkTables();
