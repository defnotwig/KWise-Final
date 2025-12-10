const {query} = require('../config/db');

async function checkData() {
    try {
        // Check CPU items with descriptions
        const result = await query(`
            SELECT id, name, category, description, 
                   CASE WHEN description IS NULL THEN 'NULL' 
                        WHEN description = '' THEN 'EMPTY'
                        ELSE 'HAS DESC' END as desc_status
            FROM pc_parts 
            WHERE category = 'CPU' 
            ORDER BY id
            LIMIT 10
        `);
        
        console.log('\n=== CPU ITEMS DESCRIPTION STATUS ===\n');
        result.rows.forEach(row => {
            console.log(`ID: ${row.id} | ${row.name}`);
            console.log(`   Status: ${row.desc_status}`);
            if (row.description) {
                console.log(`   Description: ${row.description.substring(0, 100)}...`);
            }
            console.log('');
        });
        
        // Check all categories
        const catResult = await query(`
            SELECT category, 
                   COUNT(*) as total,
                   COUNT(description) as has_desc,
                   COUNT(CASE WHEN description = '' THEN 1 END) as empty_desc,
                   COUNT(CASE WHEN description IS NULL THEN 1 END) as null_desc
            FROM pc_parts 
            WHERE is_active = true
            GROUP BY category
            ORDER BY category
        `);
        
        console.log('\n=== DESCRIPTION STATS BY CATEGORY ===\n');
        catResult.rows.forEach(row => {
            console.log(`${row.category}:`);
            console.log(`   Total: ${row.total}`);
            console.log(`   Has Description: ${row.has_desc}`);
            console.log(`   Empty: ${row.empty_desc}`);
            console.log(`   NULL: ${row.null_desc}`);
            console.log('');
        });
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkData();
