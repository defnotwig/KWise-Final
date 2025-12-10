const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function checkImages() {
    try {
        // Check items with images
        const result = await pool.query('SELECT id, name, image_url FROM pc_parts WHERE image_url IS NOT NULL LIMIT 5');
        
        console.log('📷 Items with images in database:');
        if (result.rows.length === 0) {
            console.log('   No items with images found');
        } else {
            result.rows.forEach(row => {
                console.log(`   ID ${row.id}: ${row.name}`);
                console.log(`      Image URL: ${row.image_url}`);
            });
        }
        
        console.log('\n📊 Total items with images:');
        const countResult = await pool.query('SELECT COUNT(*) FROM pc_parts WHERE image_url IS NOT NULL');
        console.log(`   ${countResult.rows[0].count} items have images`);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkImages();