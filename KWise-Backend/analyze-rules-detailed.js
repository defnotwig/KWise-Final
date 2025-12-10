const { query } = require('./config/db');

(async () => {
  try {
    console.log('📊 Analyzing compatibility_rules table...\n');

    // Get table schema
    const schema = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'compatibility_rules' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table columns:');
    schema.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`));

    // Total count
    const totalResult = await query(`
      SELECT COUNT(*) as total 
      FROM compatibility_rules 
      WHERE enabled = true
    `);
    console.log(`\n✅ Total active rules: ${totalResult.rows[0].total}\n`);

    // Rules by type
    const byTypeResult = await query(`
      SELECT rule_type, COUNT(*) as count 
      FROM compatibility_rules 
      WHERE enabled = true 
      GROUP BY rule_type 
      ORDER BY count DESC
      LIMIT 15
    `);
    console.log('📋 Top 15 rule types:');
    byTypeResult.rows.forEach(r => {
      console.log(`  ${r.rule_type.padEnd(30)}: ${r.count}`);
    });

    // Sample rules with full details
    const sampleResult = await query(`
      SELECT * 
      FROM compatibility_rules 
      WHERE enabled = true 
      LIMIT 3
    `);
    console.log('\n📝 Sample rules (full details):');
    sampleResult.rows.forEach((r, i) => {
      console.log(`\n  Rule ${i + 1}:`);
      console.log(`    Type: ${r.rule_type}`);
      console.log(`    From: ${r.from_category} (${r.from_part_type || 'any'})`);
      console.log(`    To: ${r.to_category} (${r.to_part_type || 'any'})`);
      console.log(`    Description: ${r.rule_description}`);
      console.log(`    Severity: ${r.severity}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
