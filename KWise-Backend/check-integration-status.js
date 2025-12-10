/**
 * Simple Test: Check if database rules integration is working
 * by examining the latest compatibility_logs entry
 */

const db = require('./config/db');

async function main() {
  console.log('\n🔍 ===== CHECKING DATABASE RULES INTEGRATION =====\n');

  try {
    // Check the latest compatibility_logs entry
    const result = await db.query(`
      SELECT 
        id,
        rules_verdict,
        created_at
      FROM compatibility_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ No compatibility checks found in database');
      return;
    }

    console.log(`📊 Found ${result.rows.length} recent compatibility checks\n`);

    result.rows.forEach((log, idx) => {
      console.log(`${idx + 1}. Entry #${log.id} - ${new Date(log.created_at).toLocaleString()}`);
      
      if (log.rules_verdict) {
        const verdict = log.rules_verdict;
        
        console.log(`   Total: ${verdict.total || 'N/A'}`);
        console.log(`   Compatible: ${verdict.compatible_count || 'N/A'}`);
        console.log(`   Deterministic: ${verdict.deterministic ? 'Yes' : 'No'}`);
        
        // Check for database rules
        if (verdict.database_rules_applied !== undefined) {
          console.log(`   ✅ Database Rules Applied: ${verdict.database_rules_applied}`);
          
          if (verdict.rulesApplied && verdict.rulesApplied.length > 0) {
            console.log(`   ✅ Rules Logged: ${verdict.rulesApplied.length}`);
            console.log(`      Sample rules:`);
            verdict.rulesApplied.slice(0, 3).forEach(rule => {
              console.log(`         • ${rule.ruleName} (${rule.category}) - ${rule.severity}`);
            });
          }
        } else {
          console.log(`   ⚠️ No database_rules_applied field found`);
        }
      }
      
      console.log('');
    });

    // Check if latest entry has database rules
    const latestVerdict = result.rows[0].rules_verdict;
    
    console.log('═══════════════════════════════════════\n');
    
    if (latestVerdict && latestVerdict.database_rules_applied !== undefined) {
      if (latestVerdict.database_rules_applied > 0) {
        console.log('✅ SUCCESS! Database rules integration is working!');
        console.log(`   Latest check applied ${latestVerdict.database_rules_applied} database rules`);
        console.log(`   Rules are being logged to compatibility_logs table`);
      } else {
        console.log('⚠️ PARTIAL: Integration exists but no rules were applied');
        console.log('   This could mean:');
        console.log('   - No rules matched the component pair');
        console.log('   - Components tested don\'t have applicable rules');
      }
    } else {
      console.log('❌ FAILED: Database rules not integrated');
      console.log('   The compatibility_logs table does not contain database_rules_applied field');
      console.log('   Integration may not be complete or no new checks have been run');
    }

    console.log('\n📋 Next Steps:');
    console.log('   1. Trigger a new compatibility check through the frontend');
    console.log('   2. Check if the rules_verdict includes database_rules_applied');
    console.log('   3. Verify that ruleEngine.checkComponentPair() is being called\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

main();
