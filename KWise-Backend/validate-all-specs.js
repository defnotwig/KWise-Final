const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function validateAllSpecifications() {
    try {
        console.log('🔍 COMPREHENSIVE SPECIFICATION VALIDATION\n');

        // Test all categories
        const categories = [
            'Case', 'Cooling', 'CPU', 'GPU', 'Headphones', 
            'Keyboard', 'Monitor', 'Motherboard', 'Mouse', 
            'PSU', 'RAM', 'Speakers', 'Storage', 'Webcam'
        ];

        for (const category of categories) {
            console.log(`📊 ${category.toUpperCase()}`);
            console.log('─'.repeat(40));

            // Check specification schema
            const schemaResult = await pool.query(`
                SELECT field_name, field_type 
                FROM specification_schemas 
                WHERE category = $1 
                ORDER BY field_name
            `, [category]);

            console.log(`Schema fields: ${schemaResult.rows.length}`);

            // Check populated items
            const itemsResult = await pool.query(`
                SELECT COUNT(*) as total,
                       COUNT(CASE WHEN specifications IS NOT NULL AND specifications != '{}' THEN 1 END) as populated
                FROM pc_parts 
                WHERE category = $1
            `, [category]);

            const { total, populated } = itemsResult.rows[0];
            const percentage = total > 0 ? ((populated / total) * 100).toFixed(1) : 0;

            console.log(`Populated items: ${populated}/${total} (${percentage}%)`);

            // Sample specification
            const sampleResult = await pool.query(`
                SELECT name, specifications 
                FROM pc_parts 
                WHERE category = $1 
                AND specifications IS NOT NULL 
                AND specifications != '{}' 
                LIMIT 1
            `, [category]);

            if (sampleResult.rows.length > 0) {
                const sample = sampleResult.rows[0];
                const specKeys = Object.keys(sample.specifications);
                console.log(`Sample (${sample.name}): ${specKeys.slice(0, 3).join(', ')}`);
            }

            console.log('');
        }

        await pool.end();
        console.log('🎯 Validation complete!');
        
    } catch (error) {
        console.error('❌ Error during validation:', error);
        await pool.end();
    }
}

validateAllSpecifications();