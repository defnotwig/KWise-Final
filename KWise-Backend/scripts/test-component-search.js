const db = require('../config/db');

async function testComponentSearch() {
    try {
        console.log('\n=== TESTING COMPONENT SEARCH ===\n');
        
        // Test CPU category
        const cpuResult = await db.query(`
            SELECT id, name, brand, price, stock, image_url, category
            FROM pc_parts
            WHERE category = $1 AND is_active = true
            ORDER BY name ASC
        `, ['CPU']);
        
        console.log(`CPU Results: ${cpuResult.rows.length} items`);
        cpuResult.rows.slice(0, 5).forEach(item => {
            console.log(`  - ID: ${item.id} | ${item.name} | ${item.brand || 'N/A'} | ₱${item.price}`);
        });
        
        // Test Motherboard category
        const moboResult = await db.query(`
            SELECT id, name, brand, price, stock, image_url, category
            FROM pc_parts
            WHERE category = $1 AND is_active = true
            ORDER BY name ASC
        `, ['Motherboard']);
        
        console.log(`\nMotherboard Results: ${moboResult.rows.length} items`);
        moboResult.rows.slice(0, 3).forEach(item => {
            console.log(`  - ID: ${item.id} | ${item.name} | ${item.brand || 'N/A'} | ₱${item.price}`);
        });
        
        // Test RAM category
        const ramResult = await db.query(`
            SELECT id, name, brand, price, stock, image_url, category
            FROM pc_parts
            WHERE category = $1 AND is_active = true
            ORDER BY name ASC
        `, ['RAM']);
        
        console.log(`\nRAM Results: ${ramResult.rows.length} items`);
        ramResult.rows.slice(0, 3).forEach(item => {
            console.log(`  - ID: ${item.id} | ${item.name} | ${item.brand || 'N/A'} | ₱${item.price}`);
        });
        
        // Check is_active field
        const activeCheck = await db.query(`
            SELECT 
                is_active,
                COUNT(*) as count
            FROM pc_parts
            WHERE category IN ('CPU', 'Motherboard', 'RAM')
            GROUP BY is_active
        `);
        
        console.log(`\nActive status distribution:`, activeCheck.rows);
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        console.error(error);
        process.exit(1);
    }
}

testComponentSearch();
