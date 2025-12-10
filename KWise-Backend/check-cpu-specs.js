const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkCPUSpecs() {
    try {
        const result = await pool.query(`
            SELECT field_name, field_type 
            FROM specification_schemas 
            WHERE category = 'CPU' 
            ORDER BY field_name
        `);
        
        console.log('CPU specification fields:');
        result.rows.forEach(row => {
            console.log(`- ${row.field_name} (${row.field_type})`);
        });
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkCPUSpecs();