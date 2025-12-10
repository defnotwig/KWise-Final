const { query } = require('../config/db');

async function checkPSUItems() {
    try {
        console.log('🔍 Checking PSU items in database...\n');
        
        const result = await query(`
            SELECT id, name, brand, category, price, stock 
            FROM pc_parts 
            WHERE category = 'PSU' AND is_active = true 
            ORDER BY name 
            LIMIT 10
        `);
        
        console.log(`✅ Found ${result.rows.length} PSU items:\n`);
        
        result.rows.forEach(row => {
            console.log(`  • ID: ${row.id} - ${row.name} (${row.brand}) - ₱${row.price} - Stock: ${row.stock}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit();
    }
}

checkPSUItems();
