const db = require('../config/db');

async function checkCompatibilityStatus() {
    try {
        console.log('🔍 Checking Compatibility System Status...\n');
        
        // Check compatibility rules
        const rulesTotal = await db.query('SELECT COUNT(*) as total FROM compatibility_rules WHERE is_active = true');
        console.log(`✅ Active Compatibility Rules: ${rulesTotal.rows[0].total}`);
        
        const rulesByType = await db.query(`
            SELECT rule_type, COUNT(*) as count 
            FROM compatibility_rules 
            WHERE is_active = true 
            GROUP BY rule_type 
            ORDER BY count DESC 
            LIMIT 10
        `);
        console.log('\n📋 Top 10 Rule Types:');
        rulesByType.rows.forEach(r => {
            console.log(`   ${r.rule_type}: ${r.count} rules`);
        });
        
        // Check compatibility matrix
        const matrixCount = await db.query('SELECT COUNT(*) as total FROM compatibility_matrix');
        console.log(`\n📊 Compatibility Matrix: ${matrixCount.rows[0].total} pre-computed pairs`);
        
        if (matrixCount.rows[0].total === '0') {
            console.log('   ⚠️  Matrix is EMPTY - need to run populate-compatibility-matrix.js');
        } else {
            const matrixSample = await db.query('SELECT * FROM compatibility_matrix LIMIT 3');
            console.log('   Sample pairs:', matrixSample.rows.length);
        }
        
        // Check if rule engine is being called
        const ruleEngineUsage = await db.query(`
            SELECT COUNT(*) as count 
            FROM audit_logs 
            WHERE description LIKE '%rule engine%' 
            AND created_at > NOW() - INTERVAL '1 day'
        `);
        console.log(`\n🔧 Rule Engine Usage (last 24h): ${ruleEngineUsage.rows[0].count} calls`);
        
        // Check product counts
        const products = await db.query(`
            SELECT category, COUNT(*) as count 
            FROM pc_parts 
            GROUP BY category 
            ORDER BY count DESC
        `);
        console.log('\n📦 Products by Category:');
        products.rows.forEach(p => {
            console.log(`   ${p.category}: ${p.count} items`);
        });
        
        console.log('\n✅ Analysis Complete\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCompatibilityStatus();
