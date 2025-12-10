const db = require('./config/db');

(async () => {
    try {
        console.log('🔍 Checking what products 602-634 are...\n');
        
        const result = await db.query(`
            SELECT id, name, category
            FROM pc_parts
            WHERE id BETWEEN 602 AND 634
            ORDER BY id
            LIMIT 10
        `);
        
        console.log(`Found ${result.rows.length} products:\n`);
        
        result.rows.forEach(p => {
            console.log(`   ${p.id}: ${p.name} (${p.category})`);
        });
        
        // Check category distribution
        const categoryCount = await db.query(`
            SELECT category, COUNT(*) as count
            FROM pc_parts
            WHERE id BETWEEN 602 AND 634
            GROUP BY category
        `);
        
        console.log(`\nCategory distribution:`);
        categoryCount.rows.forEach(c => {
            console.log(`   ${c.category}: ${c.count}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
})();
