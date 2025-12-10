const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkTableStructure() {
    try {
        // Check pc_parts structure
        const result = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'pc_parts' 
            ORDER BY ordinal_position
        `);
        
        console.log('📋 PC_PARTS TABLE STRUCTURE:');
        console.log('============================');
        result.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // Check if there are any constraints
        const constraints = await pool.query(`
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'pc_parts'
        `);
        
        console.log('\n🔒 CONSTRAINTS:');
        console.log('===============');
        constraints.rows.forEach(row => {
            console.log(`${row.constraint_name}: ${row.constraint_type}`);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTableStructure();