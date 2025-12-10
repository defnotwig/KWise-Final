const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkConstraints() {
    try {
        // Check the category constraint
        const result = await pool.query(`
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE constraint_name LIKE '%category%'
        `);
        
        console.log('🔒 CATEGORY CONSTRAINTS:');
        console.log('========================');
        result.rows.forEach(row => {
            console.log(`${row.constraint_name}: ${row.check_clause}`);
        });
        
        // Also check if there are existing categories in the table
        const existingCategories = await pool.query(`
            SELECT DISTINCT category FROM pc_parts
        `);
        
        console.log('\n📋 EXISTING CATEGORIES (if any):');
        console.log('=================================');
        existingCategories.rows.forEach(row => {
            console.log(row.category);
        });
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkConstraints();