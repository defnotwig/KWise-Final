require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkDatabaseTables() {
    try {
        // Get all database tables
        const tablesResult = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE' 
            ORDER BY table_name
        `);
        
        console.log('=== ALL DATABASE TABLES ===');
        tablesResult.rows.forEach(row => {
            console.log('- ' + row.table_name);
        });
        
        // Check specific tables that should exist for categories
        const categoriesToCheck = [
            'motherboard', 'cooling', 'headphones', 'speakers', 'webcam'
        ];
        
        console.log('\n=== CHECKING CATEGORY SPECIFICATION TABLES ===');
        
        for (const category of categoriesToCheck) {
            const tableExists = tablesResult.rows.some(row => row.table_name === category);
            
            if (tableExists) {
                // Check columns in this table
                const columnsResult = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1 
                    ORDER BY ordinal_position
                `, [category]);
                
                console.log(`\n📊 Table '${category}' exists with columns:`);
                columnsResult.rows.forEach(col => {
                    console.log(`  - ${col.column_name} (${col.data_type})`);
                });
                
                // Check if it has any data
                const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${category}`);
                console.log(`  📋 Contains ${countResult.rows[0].count} records`);
                
            } else {
                console.log(`\n❌ Table '${category}' does NOT exist`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkDatabaseTables();