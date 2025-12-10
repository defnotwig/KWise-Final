const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkPeripheralSpecs() {
    try {
        console.log('🔍 Checking Peripheral specifications...');
        
        const result = await pool.query(`
            SELECT name, brand, specifications 
            FROM pc_parts 
            WHERE category='Peripherals' 
            LIMIT 5
        `);
        
        console.log(`Found ${result.rows.length} peripheral items:`);
        
        result.rows.forEach(row => {
            console.log(`\n📦 ${row.name} (${row.brand})`);
            if (row.specifications) {
                console.log('   Specs:', JSON.stringify(row.specifications, null, 4));
            }
        });
        
        // Also check schema for Peripherals
        const schemaResult = await pool.query(`
            SELECT field_name, field_type 
            FROM specification_schemas 
            WHERE category='Peripherals' 
            ORDER BY field_name
        `);
        
        console.log(`\n📋 Schema fields for Peripherals (${schemaResult.rows.length}):`);
        schemaResult.rows.forEach(row => {
            console.log(`   - ${row.field_name} (${row.field_type})`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

checkPeripheralSpecs();