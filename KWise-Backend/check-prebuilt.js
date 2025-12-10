const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'KWiseDB',
    password: 'humbleludwig13',
    port: 5432
});

async function checkPreBuilt() {
    try {
        const result = await pool.query(`
            SELECT 
                id, 
                name, 
                price, 
                category, 
                specifications,
                stock,
                is_active
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            AND is_active = true 
            ORDER BY price ASC
        `);

        console.log('\n📊 PRE-BUILT PRODUCTS IN DATABASE:');
        console.log('===================================\n');
        console.log(`Total: ${result.rows.length} products\n`);
        
        result.rows.forEach((row, index) => {
            console.log(`${index + 1}. ${row.name}`);
            console.log(`   Price: ₱${parseFloat(row.price).toLocaleString()}`);
            console.log(`   Stock: ${row.stock}`);
            console.log(`   Specifications:`, row.specifications);
            console.log('');
        });

        await pool.end();
    } catch (error) {
        console.error('❌ Database error:', error.message);
        await pool.end();
        process.exit(1);
    }
}

checkPreBuilt();
