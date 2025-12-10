const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'humbleludwig13',
    port: process.env.DB_PORT || 5432
});

async function checkEliteCorruption() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('CHECKING ELITE PRE-BUILT ITEMS FOR CORRUPTION');
        console.log('═══════════════════════════════════════════════════════════════');

        const result = await pool.query(`
            SELECT id, name, category, specifications 
            FROM pc_parts 
            WHERE category = 'Pre-Built' AND name LIKE '%Elite%' 
            ORDER BY id
        `);

        result.rows.forEach(row => {
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`ID: ${row.id}`);
            console.log(`Name: ${row.name}`);
            console.log(`Category: ${row.category}`);
            console.log(`Specifications Type: ${typeof row.specifications}`);
            
            if (typeof row.specifications === 'object') {
                console.log(`\nSpecifications Structure:`);
                console.log(`  - buildType: ${row.specifications.buildType}`);
                console.log(`  - purposes: ${JSON.stringify(row.specifications.purposes)}`);
                console.log(`  - purposes type: ${typeof row.specifications.purposes} (Array: ${Array.isArray(row.specifications.purposes)})`);
                console.log(`  - components type: ${typeof row.specifications.components} (Array: ${Array.isArray(row.specifications.components)})`);
                
                if (Array.isArray(row.specifications.components)) {
                    console.log(`  - components count: ${row.specifications.components.length}`);
                    console.log(`  - First component:`, row.specifications.components[0]);
                } else {
                    console.log(`  ❌ CORRUPTED: components is not an array!`);
                    console.log(`  - components value:`, row.specifications.components);
                }
                
                console.log(`\nFull Specifications:`, JSON.stringify(row.specifications, null, 2));
            } else {
                console.log(`❌ CORRUPTED: specifications is not an object!`);
                console.log(`Specifications:`, row.specifications);
            }
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`Total Elite items found: ${result.rows.length}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

checkEliteCorruption();
