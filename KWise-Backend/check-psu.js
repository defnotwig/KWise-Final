const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkPSU() {
    try {
        console.log('📊 PSU ANALYSIS\n');

        // Get PSU table columns
        const psuColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'psu' 
            ORDER BY ordinal_position
        `);

        console.log('PSU table columns:');
        psuColumns.rows.forEach(row => console.log(`- ${row.column_name}`));

        // Get PSU specification fields
        const psuSpecs = await pool.query(`
            SELECT field_name 
            FROM specification_schemas 
            WHERE category = 'PSU' 
            ORDER BY field_name
        `);

        console.log('\nPSU specification fields:');
        psuSpecs.rows.forEach(row => console.log(`- ${row.field_name}`));

        console.log('\n🔍 Current UPDATE case includes:');
        const currentFields = ['wattage', 'efficiency', 'modular', 'certification'];
        currentFields.forEach(field => console.log(`- ${field}`));

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

checkPSU();