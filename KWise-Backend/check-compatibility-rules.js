const { query } = require('./config/db');

(async () => {
  try {
    console.log('📊 Analyzing compatibility_rules table...\n');

    // Total count
    const totalResult = await query(`
      SELECT COUNT(*) as total 
      FROM compatibility_rules 
      WHERE enabled = true
    `);
    console.log(`✅ Total active rules: ${totalResult.rows[0].total}\n`);

    // Rules by type
    const byTypeResult = await query(`
      SELECT rule_type, COUNT(*) as count 
      FROM compatibility_rules 
      WHERE enabled = true 
      GROUP BY rule_type 
      ORDER BY count DESC
    `);
    console.log('📋 Rules by type:');
    byTypeResult.rows.forEach(r => {
      console.log(`  ${r.rule_type.padEnd(30)}: ${r.count}`);
    });

    // Rules by category
    const byCategoryResult = await query(`
      SELECT category, COUNT(*) as count 
      FROM compatibility_rules 
      WHERE enabled = true 
      GROUP BY category 
      ORDER BY count DESC
    `);
    console.log('\n📦 Rules by category:');
    byCategoryResult.rows.forEach(r => {
      console.log(`  ${r.category.padEnd(30)}: ${r.count}`);
    });

    // Sample rules
    const sampleResult = await query(`
      SELECT rule_type, category, rule_description 
      FROM compatibility_rules 
      WHERE enabled = true 
      LIMIT 5
    `);
    console.log('\n📝 Sample rules:');
    sampleResult.rows.forEach((r, i) => {
      console.log(`  ${i + 1}. [${r.rule_type}] ${r.category}: ${r.rule_description.substring(0, 80)}...`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
