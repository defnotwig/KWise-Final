/**
 * Quick verification of database rules integration status
 */

const db = require('./config/db');

async function verify() {
    console.log('\n🔍 ===== DATABASE RULES INTEGRATION VERIFICATION =====\n');
    
    try {
        // 1. Check compatibility_rules table
        console.log('1. Checking compatibility_rules table...');
        const rulesCount = await db.query(`
            SELECT 
                rule_category,
                COUNT(*) as count
            FROM compatibility_rules 
            WHERE enabled = true 
            GROUP BY rule_category 
            ORDER BY count DESC
        `);
        
        console.log('\n📊 Rules by Category:');
        let total = 0;
        rulesCount.rows.forEach(row => {
            console.log(`   ${row.rule_category}: ${row.count}`);
            total += parseInt(row.count);
        });
        console.log(`   ─────────────────────`);
        console.log(`   TOTAL: ${total} rules\n`);
        
        // 2. Check latest compatibility_logs
        console.log('2. Checking latest compatibility_logs...');
        const latestLogs = await db.query(`
            SELECT 
                id,
                rules_verdict,
                created_at
            FROM compatibility_logs 
            ORDER BY created_at DESC 
            LIMIT 3
        `);
        
        console.log('\n📋 Latest 3 Compatibility Checks:');
        latestLogs.rows.forEach((log, idx) => {
            const verdict = log.rules_verdict;
            console.log(`\n${idx + 1}. Log #${log.id} - ${log.created_at}`);
            console.log(`   Compatible: ${verdict.compatible_count}/${verdict.total}`);
            console.log(`   Deterministic: ${verdict.deterministic}`);
            
            if (verdict.database_rules_applied !== undefined) {
                console.log(`   ✅ Database Rules Applied: ${verdict.database_rules_applied}`);
                if (verdict.rulesApplied && verdict.rulesApplied.length > 0) {
                    console.log(`   📋 Sample Rules:`);
                    verdict.rulesApplied.slice(0, 3).forEach(rule => {
                        console.log(`      - ${rule.ruleName} (${rule.category}) - ${rule.severity}`);
                    });
                }
            } else {
                console.log(`   ⚠️ No database_rules_applied field`);
            }
        });
        
        // 3. Check if rule engine is functional
        console.log('\n\n3. Testing rule engine functionality...');
        const ruleEngine = require('./services/ruleEngine');
        
        const testComponentA = { 
            id: 1, 
            name: 'Test CPU', 
            category: 'CPU',
            specifications: { socket: 'AM5' }
        };
        
        const testComponentB = { 
            id: 2, 
            name: 'Test Motherboard', 
            category: 'Motherboard',
            specifications: { socket: 'AM5' }
        };
        
        const result = await ruleEngine.checkComponentPair(testComponentA, testComponentB);
        console.log(`   ✅ Rule engine operational`);
        console.log(`   - Rules applied: ${result.rulesApplied?.length || 0}`);
        console.log(`   - Execution time: ${result.executionTime}ms`);
        
        // 4. Summary
        console.log('\n\n✅ ===== VERIFICATION SUMMARY =====\n');
        console.log(`✅ Total database rules: ${total}`);
        console.log(`✅ Rule engine: Operational`);
        console.log(`✅ Latest log has database_rules_applied: ${latestLogs.rows[0].rules_verdict.database_rules_applied !== undefined ? 'YES' : 'NO'}`);
        
        if (latestLogs.rows[0].rules_verdict.database_rules_applied === 0) {
            console.log('\n⚠️  NOTE: Database rules applied count is 0');
            console.log('   This could mean:');
            console.log('   1. No rules matched for the tested components');
            console.log('   2. The specifications in database are incomplete');
            console.log('   3. Need to test with components that have matching rules');
            console.log('\n   Try testing with:');
            console.log('   - CPU with AM5 socket + Motherboard with AM5 socket');
            console.log('   - Components with complete specification data');
        }
        
        console.log('\n📋 Next Steps:');
        console.log('   1. Test via frontend to generate real compatibility checks');
        console.log('   2. Ensure products have complete specification data');
        console.log('   3. Monitor logs for database_rules_applied > 0');
        console.log();
        
    } catch (error) {
        console.error('\n❌ Verification failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await db.end();
    }
}

verify();
