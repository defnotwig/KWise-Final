const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function getFieldsForMissingCategories() {
    try {
        const missingCategories = [
            { table: 'monitor', category: 'Monitor' },
            { table: 'keyboard', category: 'Keyboard' },
            { table: 'mouse', category: 'Mouse' },
            { table: 'headphones', category: 'Headphones' },
            { table: 'speakers', category: 'Speakers' },
            { table: 'webcam', category: 'Webcam' }
        ];

        for (const { table, category } of missingCategories) {
            console.log(`📊 ${category.toUpperCase()} (${table}):`);
            console.log('─'.repeat(40));

            try {
                // Get table columns
                const columns = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [table]);

                console.log('Table columns:');
                columns.rows.forEach(row => {
                    if (!['id', 'name', 'created_at', 'updated_at', 'price'].includes(row.column_name)) {
                        console.log(`  ${row.column_name} (${row.data_type})`);
                    }
                });

                // Get specification fields
                const specs = await pool.query(`
                    SELECT field_name, field_type 
                    FROM specification_schemas 
                    WHERE category = $1 
                    ORDER BY field_name
                `, [category]);

                console.log('Specification fields:');
                specs.rows.forEach(row => {
                    console.log(`  ${row.field_name} (${row.field_type})`);
                });

                console.log('');
            } catch (error) {
                console.log(`  ❌ Error: ${error.message}\n`);
            }
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await pool.end();
    }
}

getFieldsForMissingCategories();