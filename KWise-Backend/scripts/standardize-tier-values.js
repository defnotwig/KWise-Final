const db = require('../config/db');

/**
 * Standardizes tier values in pc_parts table
 * Maps various existing tier names to standard values: entry, mid-tier, high-tier, elite
 */

const tierMapping = {
    // Entry level
    'budget': 'entry',
    'Starter': 'entry',
    'starter': 'entry',
    
    // Mid tier
    'mid-range': 'mid-tier',
    'Mid Tier': 'mid-tier',
    'mid tier': 'mid-tier',
    'midrange': 'mid-tier',
    
    // High tier
    'high-end': 'high-tier',
    'High Tier': 'high-tier',
    'high tier': 'high-tier',
    'highend': 'high-tier',
    'premium': 'high-tier',
    
    // Elite tier
    'Elite': 'elite',
    'ultra': 'elite',
    'Ultra': 'elite'
};

(async () => {
    try {
        console.log('🚀 Starting tier standardization...\n');
        
        // Start transaction
        await db.query('BEGIN');
        
        // Get current tier distribution
        const beforeResult = await db.query(`
            SELECT tier, COUNT(*) as count 
            FROM pc_parts 
            WHERE tier IS NOT NULL 
            GROUP BY tier 
            ORDER BY tier
        `);
        
        console.log('📋 Current tier distribution:');
        beforeResult.rows.forEach(r => {
            const newValue = tierMapping[r.tier] || r.tier;
            console.log(`  ${r.tier} → ${newValue} (${r.count} items)`);
        });
        console.log('');
        
        // Update each tier value
        let totalUpdated = 0;
        for (const [oldValue, newValue] of Object.entries(tierMapping)) {
            const result = await db.query(`
                UPDATE pc_parts 
                SET tier = $1 
                WHERE tier = $2
                RETURNING id
            `, [newValue, oldValue]);
            
            if (result.rowCount > 0) {
                console.log(`✅ Updated ${result.rowCount} items: "${oldValue}" → "${newValue}"`);
                totalUpdated += result.rowCount;
            }
        }
        
        // Commit transaction
        await db.query('COMMIT');
        
        console.log(`\n✅ Standardization complete! ${totalUpdated} items updated.`);
        
        // Show new distribution
        const afterResult = await db.query(`
            SELECT tier, COUNT(*) as count 
            FROM pc_parts 
            WHERE tier IS NOT NULL 
            GROUP BY tier 
            ORDER BY tier
        `);
        
        console.log('\n📊 New tier distribution:');
        afterResult.rows.forEach(r => {
            console.log(`  ${r.tier}: ${r.count} items`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        await db.query('ROLLBACK');
        process.exit(1);
    }
})();
