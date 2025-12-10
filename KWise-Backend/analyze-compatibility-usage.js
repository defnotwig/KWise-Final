const db = require('./config/db');

async function main() {
  try {
    console.log('\n🔍 ===== ANALYZING COMPATIBILITY SYSTEM USAGE =====\n');
    
    // 1. Check how many compatibility checks have been made
    const totalChecks = await db.query('SELECT COUNT(*) FROM compatibility_logs');
    console.log(`✅ Total compatibility checks: ${totalChecks.rows[0].count}\n`);
    
    // 2. Sample rules_verdict structures
    console.log('📊 Analyzing rules_verdict structures (last 10 entries):');
    const recentVerdicts = await db.query(`
      SELECT 
        id,
        rules_verdict,
        created_at
      FROM compatibility_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n');
    recentVerdicts.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. Entry #${row.id} (${row.created_at})`);
      if (row.rules_verdict) {
        console.log(`   Total compatible: ${row.rules_verdict.compatible_count || 0} / ${row.rules_verdict.total || 0}`);
        console.log(`   Deterministic: ${row.rules_verdict.deterministic}`);
        if (row.rules_verdict.rules_applied) {
          console.log(`   Rules applied: ${row.rules_verdict.rules_applied.length}`);
        } else {
          console.log(`   ⚠️ No 'rules_applied' field - using hardcoded logic!`);
        }
      }
      console.log('');
    });
    
    // 3. Check unique rule categories being logged
    const categories = await db.query(`
      SELECT DISTINCT
        jsonb_path_query(rules_verdict, '$.rule_category') as category
      FROM compatibility_logs
      WHERE rules_verdict IS NOT NULL
      LIMIT 50
    `);
    
    if (categories.rows.length > 0) {
      console.log('📋 Rule categories found in logs:');
      categories.rows.forEach(row => {
        console.log(`   - ${row.category}`);
      });
    } else {
      console.log('⚠️ No rule categories found in logs - compatibility_rules table NOT integrated!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
