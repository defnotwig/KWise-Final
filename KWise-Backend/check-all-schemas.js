const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkAllCategorySchemas() {
    try {
        console.log('🔍 CHECKING ALL CATEGORY TABLE SCHEMAS\n');

        const categories = [
            'cpu', 'gpu', 'ram', 'storage', 'motherboard', 
            'psu', 'pc_case', 'cooling', 'monitor', 
            'headphones', 'keyboard', 'mouse', 'speakers', 'webcam'
        ];

        for (const tableName of categories) {
            console.log(`📊 ${tableName.toUpperCase()} TABLE:`)
            console.log('─'.repeat(30));

            try {
                // Get table schema
                const schema = await pool.query(`
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [tableName]);

                if (schema.rows.length === 0) {
                    console.log(`  ⚠️  Table ${tableName} does not exist\n`);
                    continue;
                }

                console.log('  Columns:');
                schema.rows.forEach(row => {
                    console.log(`    • ${row.column_name} (${row.data_type})`);
                });

                // Get corresponding specification schema
                const categoryName = tableName === 'pc_case' ? 'Case' :
                                   tableName.charAt(0).toUpperCase() + tableName.slice(1);

                const specSchema = await pool.query(`
                    SELECT field_name, field_type 
                    FROM specification_schemas 
                    WHERE category = $1 
                    ORDER BY field_name
                `, [categoryName]);

                if (specSchema.rows.length > 0) {
                    console.log('  Specification fields:');
                    specSchema.rows.forEach(row => {
                        console.log(`    • ${row.field_name} (${row.field_type})`);
                    });

                    // Check for mismatches
                    const dbColumns = schema.rows.map(r => r.column_name);
                    const specFields = specSchema.rows.map(r => r.field_name);
                    
                    const missingInTable = specFields.filter(field => 
                        !dbColumns.includes(field) && 
                        !['id', 'name', 'created_at', 'updated_at', 'price'].includes(field)
                    );
                    
                    if (missingInTable.length > 0) {
                        console.log('  ❌ Specification fields missing in table:');
                        missingInTable.forEach(field => console.log(`      • ${field}`));
                    } else {
                        console.log('  ✅ All specification fields exist in table');
                    }
                }

                console.log('');
            } catch (error) {
                console.log(`  ❌ Error checking ${tableName}: ${error.message}\n`);
            }
        }

        await pool.end();
        console.log('🎯 Schema check complete!');
        
    } catch (error) {
        console.error('❌ Error during schema check:', error);
        await pool.end();
    }
}

checkAllCategorySchemas();