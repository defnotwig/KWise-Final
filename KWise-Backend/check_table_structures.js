const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function checkTableStructures() {
    try {
        console.log('🔍 Checking table structures...');
        
        const tables = ['pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcam'];
        
        for (const table of tables) {
            console.log(`\n📋 ${table.toUpperCase()} table columns:`);
            const result = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1 
                ORDER BY ordinal_position;
            `, [table]);
            
            result.rows.forEach(row => {
                console.log(`  ${row.column_name}: ${row.data_type}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructures();