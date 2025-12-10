const db = require('../config/db');

(async () => {
    try {
        const result = await db.query(`
            SELECT tier, COUNT(*) as count 
            FROM pc_parts 
            WHERE tier IS NOT NULL 
            GROUP BY tier 
            ORDER BY tier
        `);
        
        console.log('📊 Tier distribution:');
        result.rows.forEach(r => {
            console.log(`  ${r.tier}: ${r.count} items`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
