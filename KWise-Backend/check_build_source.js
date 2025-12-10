const { query } = require('./config/db');

async function checkBuildSource() {
  try {
    const result = await query(`
      SELECT id, name, tier, specifications->>'buildSource' as build_source
      FROM pc_parts
      WHERE category = 'Pre-Built'
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('\n📊 Pre-Built products buildSource values:\n');
    result.rows.forEach(row => {
      console.log(`  [${row.id}] ${row.name} - buildSource: ${row.build_source || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

checkBuildSource();
