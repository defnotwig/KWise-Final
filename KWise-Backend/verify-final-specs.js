const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function verifySpecificationsByCategory() {
    try {
        console.log('🎯 K-Wise Specifications Verification Summary\n');

        // Get count by category
        const result = await pool.query(`
            SELECT 
                category,
                COUNT(*) as total_items,
                COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END) as populated_items,
                CAST(
                    (COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END)::float / COUNT(*)) * 100 
                    AS DECIMAL(5,1)
                ) as percentage
            FROM pc_parts 
            GROUP BY category 
            ORDER BY category
        `);

        console.log('📊 Specification Population by Category:');
        console.log('═'.repeat(60));
        
        let totalItems = 0;
        let totalPopulated = 0;

        result.rows.forEach(row => {
            totalItems += parseInt(row.total_items);
            totalPopulated += parseInt(row.populated_items);
            
            const status = row.percentage >= 90 ? '✅' : row.percentage >= 50 ? '⚠️' : '❌';
            console.log(`${status} ${row.category.padEnd(12)} | ${row.populated_items.toString().padStart(3)}/${row.total_items.toString().padStart(3)} (${row.percentage}%)`);
        });

        console.log('═'.repeat(60));
        console.log(`🎉 TOTAL: ${totalPopulated}/${totalItems} (${((totalPopulated/totalItems)*100).toFixed(1)}%)`);

        // Show sample detailed specifications
        console.log('\n🔍 Sample Detailed Specifications:');
        console.log('─'.repeat(60));

        const sampleResult = await pool.query(`
            SELECT name, category, specifications 
            FROM pc_parts 
            WHERE specifications IS NOT NULL 
            AND specifications != '{}' 
            ORDER BY category 
            LIMIT 3
        `);

        sampleResult.rows.forEach(row => {
            console.log(`\n📦 ${row.name} (${row.category})`);
            const specs = Object.entries(row.specifications).slice(0, 5);
            specs.forEach(([key, value]) => {
                console.log(`   • ${key}: ${value}`);
            });
            if (Object.keys(row.specifications).length > 5) {
                console.log(`   ... and ${Object.keys(row.specifications).length - 5} more specs`);
            }
        });

        console.log('\n✅ Verification complete!');
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

verifySpecificationsByCategory();