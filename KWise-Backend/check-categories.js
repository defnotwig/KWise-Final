const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkCategories() {
    try {
        const result = await pool.query('SELECT DISTINCT category FROM specification_schemas ORDER BY category');
        console.log('Categories in specification_schemas:');
        result.rows.forEach(row => {
            console.log(`"${row.category}"`);
        });
        await pool.end();
    } catch (error) {
        console.error('Error:', error);
        await pool.end();
    }
}

checkCategories();