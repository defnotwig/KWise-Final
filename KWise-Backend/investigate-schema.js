const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function investigateSchemaIssue() {
    try {
        console.log('🔍 INVESTIGATING SCHEMA MISMATCH ISSUE\n');

        // Check cooling table schema
        console.log('📊 COOLING TABLE SCHEMA:');
        console.log('─'.repeat(40));
        
        const coolingSchema = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'cooling' 
            ORDER BY ordinal_position
        `);
        
        console.log('Cooling table columns:');
        coolingSchema.rows.forEach(row => {
            console.log(`  • ${row.column_name} (${row.data_type})`);
        });

        // Check cooling specification schema
        console.log('\n📋 COOLING SPECIFICATION SCHEMA:');
        console.log('─'.repeat(40));
        
        const coolingSpecs = await pool.query(`
            SELECT field_name, field_type 
            FROM specification_schemas 
            WHERE category = 'Cooling' 
            ORDER BY field_name
        `);
        
        console.log('Cooling specification fields:');
        coolingSpecs.rows.forEach(row => {
            console.log(`  • ${row.field_name} (${row.field_type})`);
        });

        // Check if there are mismatched field names
        console.log('\n🔍 FIELD NAME COMPARISON:');
        console.log('─'.repeat(40));
        
        const dbColumns = coolingSchema.rows.map(r => r.column_name);
        const specFields = coolingSpecs.rows.map(r => r.field_name);
        
        console.log('Fields in specification_schemas but NOT in cooling table:');
        const missingInTable = specFields.filter(field => !dbColumns.includes(field));
        if (missingInTable.length > 0) {
            missingInTable.forEach(field => console.log(`  ❌ ${field}`));
        } else {
            console.log('  ✅ All specification fields exist in cooling table');
        }

        console.log('\nColumns in cooling table but NOT in specification_schemas:');
        const extraInTable = dbColumns.filter(col => !specFields.includes(col) && !['id', 'name', 'created_at', 'updated_at'].includes(col));
        if (extraInTable.length > 0) {
            extraInTable.forEach(col => console.log(`  ➕ ${col}`));
        } else {
            console.log('  ✅ No extra columns (excluding standard id, name, timestamps)');
        }

        // Check sample data
        console.log('\n📦 SAMPLE COOLING DATA:');
        console.log('─'.repeat(40));
        
        const sampleData = await pool.query('SELECT * FROM cooling LIMIT 1');
        if (sampleData.rows.length > 0) {
            console.log('Sample cooling item columns:', Object.keys(sampleData.rows[0]));
        }

        await pool.end();
        console.log('\n🎯 Investigation complete!');
        
    } catch (error) {
        console.error('❌ Error during investigation:', error);
        await pool.end();
    }
}

investigateSchemaIssue();