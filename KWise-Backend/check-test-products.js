// Check if test products exist in database
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD || 'admin',
    port: process.env.DB_PORT || 5432,
});

async function checkProducts() {
    try {
        console.log('🔍 Looking for test products...\n');
        
        const result = await pool.query(`
            SELECT id, name, category 
            FROM pc_parts 
            WHERE name ILIKE '%RYZEN 3 3200G%' 
               OR name ILIKE '%INTEL ARC B580%' 
               OR name ILIKE '%16GB ADATA DDR4%'
            ORDER BY category, name
        `);
        
        console.log('📋 Found products:', result.rows);
        
        if (result.rows.length === 0) {
            console.log('\n❌ No matching products found');
            console.log('🔍 Getting sample products from each category...\n');
            
            const sampleResult = await pool.query(`
                SELECT id, name, category 
                FROM pc_parts 
                WHERE category IN ('CPU', 'GPU', 'RAM')
                  AND kiosk_visible = true
                ORDER BY category, name
                LIMIT 6
            `);
            console.log('📋 Sample products:', sampleResult.rows);
        }
        
        pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        pool.end();
    }
}

checkProducts();