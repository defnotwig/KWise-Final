require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkNameMatching() {
    try {
        console.log('=== CHECKING NAME MATCHING FOR HEADPHONES ===');
        
        // First check what columns exist in stock_items
        const columnsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'stock_items' 
            ORDER BY ordinal_position
        `);
        console.log('stock_items table columns:', columnsResult.rows.map(r => r.column_name));
        
        const stockResult = await pool.query(`
            SELECT id, name 
            FROM stock_items 
            LIMIT 5
        `);
        console.log('Sample stock items:', stockResult.rows);
        
        const headphonesResult = await pool.query('SELECT id, name FROM headphones LIMIT 3');
        console.log('Headphones table:', headphonesResult.rows);
        
        // Check for exact matches
        if (stockResult.rows.length > 0 && headphonesResult.rows.length > 0) {
            const stockName = stockResult.rows[0].name.toLowerCase().trim();
            console.log(`\nTesting exact match for: "${stockName}"`);
            
            const matchResult = await pool.query(`
                SELECT * FROM headphones 
                WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
            `, [stockResult.rows[0].name]);
            
            if (matchResult.rows.length > 0) {
                console.log('✅ Found matching headphones record:', matchResult.rows[0]);
            } else {
                console.log('❌ No matching headphones record found');
                console.log('Available headphones names:');
                headphonesResult.rows.forEach(row => {
                    console.log(`  - "${row.name}"`);
                });
            }
        }
        
        console.log('\n=== CHECKING NAME MATCHING FOR SPEAKERS ===');
        
        const speakersStockResult = await pool.query(`
            SELECT id, name, category 
            FROM stock_items 
            WHERE category = 'Speakers' 
            LIMIT 3
        `);
        console.log('Stock items:', speakersStockResult.rows);
        
        const speakersResult = await pool.query('SELECT id, name FROM speakers LIMIT 3');
        console.log('Speakers table:', speakersResult.rows);
        
        // Check for exact matches
        if (speakersStockResult.rows.length > 0 && speakersResult.rows.length > 0) {
            const stockName = speakersStockResult.rows[0].name.toLowerCase().trim();
            console.log(`\nTesting exact match for: "${stockName}"`);
            
            const matchResult = await pool.query(`
                SELECT * FROM speakers 
                WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))
            `, [speakersStockResult.rows[0].name]);
            
            if (matchResult.rows.length > 0) {
                console.log('✅ Found matching speakers record:', matchResult.rows[0]);
            } else {
                console.log('❌ No matching speakers record found');
                console.log('Available speakers names:');
                speakersResult.rows.forEach(row => {
                    console.log(`  - "${row.name}"`);
                });
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkNameMatching();