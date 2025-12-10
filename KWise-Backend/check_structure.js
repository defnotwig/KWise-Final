const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkTableStructure() {
    try {
        const result = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'cpu' 
            ORDER BY ordinal_position
        `);
        
        console.log('CPU table columns:');
        result.rows.forEach(row => {
            console.log(`- ${row.column_name}: ${row.data_type}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure();