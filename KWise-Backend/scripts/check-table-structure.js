/**
 * Check pc_parts table structure
 */
const db = require('../config/db');

async function checkStructure() {
    try {
        const cols = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        
        console.log('pc_parts columns:');
        cols.rows.forEach(c => {
            const required = c.is_nullable === 'NO' ? '(required)' : '';
            console.log(`  ${c.column_name} - ${c.data_type} ${required}`);
        });
        
        // Get a sample motherboard with all fields
        const sample = await db.query(`
            SELECT * FROM pc_parts WHERE category = 'Motherboard' LIMIT 1
        `);
        
        if (sample.rows.length > 0) {
            console.log('\nSample motherboard full data:');
            console.log(JSON.stringify(sample.rows[0], null, 2));
        }
        
        process.exit(0);
    } catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}

checkStructure();
