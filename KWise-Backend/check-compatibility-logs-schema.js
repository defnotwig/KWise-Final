const db = require('./config/db');

async function main() {
  try {
    // Get compatibility_logs table structure
    const schema = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'compatibility_logs'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 compatibility_logs Table Schema:');
    console.log('═══════════════════════════════════════\n');
    schema.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type}${col.character_maximum_length ? '(' + col.character_maximum_length + ')' : ''})`);
    });
    
    // Check if table has any data
    const count = await db.query('SELECT COUNT(*) FROM compatibility_logs');
    console.log(`\n✅ Total entries: ${count.rows[0].count}`);
    
    // Sample recent entry if exists
    if (parseInt(count.rows[0].count) > 0) {
      const sample = await db.query('SELECT * FROM compatibility_logs ORDER BY created_at DESC LIMIT 1');
      console.log('\n📊 Most Recent Entry:');
      console.log(JSON.stringify(sample.rows[0], null, 2));
    } else {
      console.log('\n⚠️ No entries in compatibility_logs - rules are NOT being used by application!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
