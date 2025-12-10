const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkStorageSchema() {
    try {
        console.log('📊 STORAGE TABLE ANALYSIS\n');

        // Get storage table columns
        const storageColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'storage' 
            ORDER BY ordinal_position
        `);

        console.log('Storage table columns:');
        const dbColumns = storageColumns.rows.map(row => row.column_name);
        dbColumns.forEach(col => console.log(`- ${col}`));

        // Get storage specification fields
        const storageSpecs = await pool.query(`
            SELECT field_name 
            FROM specification_schemas 
            WHERE category = 'Storage' 
            ORDER BY field_name
        `);

        console.log('\nStorage specification fields:');
        const specFields = storageSpecs.rows.map(row => row.field_name);
        specFields.forEach(field => console.log(`- ${field}`));

        // Check what's missing
        console.log('\n🔍 ANALYSIS:');
        const updateFields = ['capacity', 'interface', 'form_factor', 'read_speed', 'write_speed'];
        console.log('Fields in current UPDATE query:', updateFields);

        const missingFromUpdate = specFields.filter(field => !updateFields.includes(field) && !['id', 'name', 'created_at', 'updated_at', 'price'].includes(field));
        if (missingFromUpdate.length > 0) {
            console.log('\n❌ Specification fields missing from UPDATE query:');
            missingFromUpdate.forEach(field => console.log(`- ${field}`));
        }

        const missingFromTable = updateFields.filter(field => !dbColumns.includes(field));
        if (missingFromTable.length > 0) {
            console.log('\n❌ UPDATE fields not in table:');
            missingFromTable.forEach(field => console.log(`- ${field}`));
        }

        if (missingFromUpdate.length === 0 && missingFromTable.length === 0) {
            console.log('\n✅ All UPDATE fields are valid and complete');
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

checkStorageSchema();