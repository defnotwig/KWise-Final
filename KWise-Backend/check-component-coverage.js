const db = require('./config/db');

(async () => {
    try {
        const query = `
            SELECT 
                category, 
                COUNT(*) as total,
                COUNT(CASE WHEN specifications->'tdp' IS NOT NULL THEN 1 END) as has_tdp,
                COUNT(CASE WHEN specifications->'wattage' IS NOT NULL THEN 1 END) as has_wattage,
                COUNT(CASE WHEN specifications->'tier' IS NOT NULL THEN 1 END) as has_tier,
                COUNT(CASE WHEN specifications->'length' IS NOT NULL THEN 1 END) as has_length,
                COUNT(CASE WHEN specifications->'height' IS NOT NULL THEN 1 END) as has_height
            FROM pc_parts 
            WHERE is_active = true 
            GROUP BY category 
            ORDER BY total DESC
        `;
        
        const result = await db.query(query);
        
        console.log('\n=== COMPONENT DATA COVERAGE ===\n');
        
        for (const row of result.rows) {
            const total = parseInt(row.total);
            const tdp = parseInt(row.has_tdp);
            const wattage = parseInt(row.has_wattage);
            const tier = parseInt(row.has_tier);
            const length = parseInt(row.has_length);
            const height = parseInt(row.has_height);
            
            console.log(`${row.category.toUpperCase()}:`);
            console.log(`  Total: ${total}`);
            console.log(`  TDP: ${tdp}/${total} (${Math.round(tdp/total*100)}%)`);
            console.log(`  Wattage: ${wattage}/${total} (${Math.round(wattage/total*100)}%)`);
            console.log(`  Tier: ${tier}/${total} (${Math.round(tier/total*100)}%)`);
            console.log(`  Length: ${length}/${total} (${Math.round(length/total*100)}%)`);
            console.log(`  Height: ${height}/${total} (${Math.round(height/total*100)}%)\n`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
