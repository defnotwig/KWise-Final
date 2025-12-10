const { query } = require('./config/db');

async function fixTierConstraints() {
    try {
        console.log('🔧 Fixing tier constraints...');
        
        // Drop all existing tier constraints
        await query('ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS tier_classification_check');
        await query('ALTER TABLE pc_parts DROP CONSTRAINT IF EXISTS pc_parts_tier_check');
        console.log('✅ Dropped old constraints');
        
        // Check current tier values
        const result = await query(`
            SELECT tier, COUNT(*) as count 
            FROM pc_parts 
            WHERE tier IS NOT NULL 
            GROUP BY tier 
            ORDER BY count DESC
        `);
        console.log('\nCurrent tier values in database:');
        console.log(JSON.stringify(result.rows, null, 2));
        
        // Update tier values to match new standard
        await query(`
            UPDATE pc_parts 
            SET tier = CASE 
                WHEN LOWER(tier) IN ('starter', 'entry', 'budget') THEN 'Entry'
                WHEN LOWER(tier) IN ('mid tier', 'mid-tier', 'mid-range', 'mid', 'middle') THEN 'Mid Tier'
                WHEN LOWER(tier) IN ('high tier', 'high-tier', 'high-end', 'high', 'premium') THEN 'High Tier'
                WHEN LOWER(tier) IN ('elite', 'enthusiast', 'ultimate', 'extreme') THEN 'Elite'
                ELSE NULL
            END
            WHERE tier IS NOT NULL
        `);
        console.log('✅ Updated tier values to standard format');
        
        // Check updated values
        const updated = await query(`
            SELECT tier, COUNT(*) as count 
            FROM pc_parts 
            WHERE tier IS NOT NULL 
            GROUP BY tier 
            ORDER BY count DESC
        `);
        console.log('\nUpdated tier values:');
        console.log(JSON.stringify(updated.rows, null, 2));
        
        // Add new constraint
        await query(`
            ALTER TABLE pc_parts 
            ADD CONSTRAINT tier_classification_check 
            CHECK (tier IS NULL OR tier IN ('Starter', 'Entry', 'Mid Tier', 'High Tier', 'Elite'))
        `);
        console.log('✅ Added new tier constraint');
        
        console.log('\n✅ Tier constraints fixed successfully');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

fixTierConstraints();
