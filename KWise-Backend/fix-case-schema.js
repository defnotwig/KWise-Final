const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function fixCaseSpecificationSchema() {
    try {
        console.log('🔧 FIXING CASE SPECIFICATION SCHEMA\n');

        // Remove existing Case specifications
        await pool.query('DELETE FROM specification_schemas WHERE category = $1', ['Case']);
        console.log('✅ Removed existing Case specification fields');

        // Add correct Case specification fields
        const caseFields = [
            { name: 'category', type: 'text', required: false },
            { name: 'color', type: 'text', required: false },
            { name: 'fans_included', type: 'number', required: false },
            { name: 'case_category', type: 'text', required: false },
            { name: 'max_gpu_length', type: 'text', required: false },
            { name: 'max_cpu_cooler_height', type: 'text', required: false },
            { name: 'tempered_glass', type: 'boolean', required: false }
        ];

        for (const field of caseFields) {
            await pool.query(`
                INSERT INTO specification_schemas (category, field_name, field_type, is_required, default_value)
                VALUES ($1, $2, $3, $4, $5)
            `, ['Case', field.name, field.type, field.required, null]);
        }

        console.log('✅ Added 7 correct Case specification fields');

        // Verify the fix
        const result = await pool.query(`
            SELECT field_name, field_type 
            FROM specification_schemas 
            WHERE category = 'Case' 
            ORDER BY field_name
        `);

        console.log('\n📋 Case specification fields now in database:');
        result.rows.forEach(row => {
            console.log(`   • ${row.field_name} (${row.field_type})`);
        });

        await pool.end();
        console.log('\n🎯 Case specification schema fixed!');
        
    } catch (error) {
        console.error('❌ Error fixing Case schema:', error);
        await pool.end();
    }
}

fixCaseSpecificationSchema();
