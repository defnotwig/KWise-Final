require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkSystemAfterCleanup() {
    try {
        console.log('=== CHECKING SYSTEM AFTER CLEANUP ===\n');
        
        // Check all stock-related tables
        const stockTables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%stock%' OR table_name LIKE '%item%' OR table_name = 'pc_parts')
            ORDER BY table_name
        `);
        
        console.log('📊 Stock-related tables:');
        stockTables.rows.forEach(row => console.log('- ' + row.table_name));
        
        // Check the structure that the API actually uses
        console.log('\n🔍 Checking how the API retrieves stock data...');
        
        // Check if the system uses pc_parts or the individual category tables
        const pcPartsCount = await pool.query('SELECT COUNT(*) as count FROM pc_parts');
        console.log(`pc_parts table: ${pcPartsCount.rows[0].count} records`);
        
        const stockItemsCount = await pool.query('SELECT COUNT(*) as count FROM stock_items');
        console.log(`stock_items table: ${stockItemsCount.rows[0].count} records`);
        
        // Check category tables
        const categories = [
            'cpu', 'motherboard', 'ram', 'storage', 'gpu', 'psu', 
            'pc_case', 'cooling', 'monitor', 'headphones', 'keyboard', 
            'mouse', 'speakers', 'webcam'
        ];
        
        console.log('\n📈 Category table counts:');
        for (const table of categories) {
            const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
            console.log(`  ${table}: ${result.rows[0].count} records`);
        }
        
        console.log('\n🔍 Testing if API can still retrieve data...');
        
        // Test a few categories
        const testCategories = ['CPU', 'RAM', 'GPU'];
        for (const category of testCategories) {
            let tableName = category.toLowerCase();
            if (category === 'CPU') tableName = 'cpu';
            
            const sampleResult = await pool.query(`SELECT id, name FROM ${tableName} LIMIT 2`);
            console.log(`✅ ${category}: ${sampleResult.rows.length} sample records found`);
            if (sampleResult.rows.length > 0) {
                console.log(`   Example: ${sampleResult.rows[0].id} - ${sampleResult.rows[0].name}`);
            }
        }
        
        console.log('\n=== CLEANUP VERIFICATION COMPLETE ===');
        
    } catch (error) {
        console.error('Error checking system:', error.message);
    } finally {
        await pool.end();
    }
}

checkSystemAfterCleanup();