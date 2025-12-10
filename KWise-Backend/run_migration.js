const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

async function runMigration() {
    try {
        console.log('🔌 Connecting to database...');
        
        // Read the SQL file
        const sqlPath = path.join(__dirname, 'sql', 'category_specifications_migration.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📁 Reading migration file...');
        
        // Execute the SQL
        await pool.query(sqlContent);
        
        console.log('✅ Category specifications migration completed successfully!');
        console.log('📊 Created all category-specific tables with sample data');
        
        // Verify tables were created
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN (
                'cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 
                'pc_case', 'cooling', 'monitors', 'headphones', 'keyboard', 
                'mouse', 'speakers', 'webcams'
            )
            ORDER BY table_name;
        `);
        
        console.log('🗃️  Created tables:', tableCheck.rows.map(row => row.table_name));
        
        // Check data counts
        const tables = ['cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 'pc_case', 'cooling', 'monitors', 'headphones', 'keyboard', 'mouse', 'speakers', 'webcams'];
        
        for (const table of tables) {
            try {
                const countResult = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`📈 ${table}: ${countResult.rows[0].count} records`);
            } catch (err) {
                console.log(`⚠️  ${table}: Table not found or error`);
            }
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Full error:', error);
    } finally {
        await pool.end();
    }
}

runMigration();