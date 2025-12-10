const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkMotherboard() {
    try {
        console.log('📊 MOTHERBOARD ANALYSIS\n');

        // Get motherboard table columns
        const mbColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'motherboard' 
            ORDER BY ordinal_position
        `);

        console.log('Motherboard table columns:');
        mbColumns.rows.forEach(row => console.log(`- ${row.column_name}`));

        // Get motherboard specification fields
        const mbSpecs = await pool.query(`
            SELECT field_name 
            FROM specification_schemas 
            WHERE category = 'Motherboard' 
            ORDER BY field_name
        `);

        console.log('\nMotherboard specification fields:');
        mbSpecs.rows.forEach(row => console.log(`- ${row.field_name}`));

        console.log('\n🔍 Current UPDATE case includes:');
        const currentFields = ['socket', 'chipset', 'form_factor', 'ram_slots', 'max_ram'];
        currentFields.forEach(field => console.log(`- ${field}`));

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

checkMotherboard();