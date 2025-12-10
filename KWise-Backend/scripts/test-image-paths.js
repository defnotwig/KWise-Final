const db = require('../config/db');

async function testImagePaths() {
    try {
        console.log('\n=== TESTING IMAGE PATHS ===\n');
        
        // Get Pre-Built products
        const prebuilt = await db.query(`
            SELECT id, name, image_url
            FROM pc_parts
            WHERE category = 'Pre-Built'
            ORDER BY id
            LIMIT 5
        `);
        
        console.log('Pre-Built Image URLs:');
        prebuilt.rows.forEach(item => {
            console.log(`  ${item.name}: ${item.image_url}`);
        });
        
        // Get Monitor products
        const monitors = await db.query(`
            SELECT id, name, image_url
            FROM pc_parts
            WHERE category = 'Monitor'
            ORDER BY price
            LIMIT 5
        `);
        
        console.log('\nMonitor Image URLs:');
        monitors.rows.forEach(item => {
            console.log(`  ${item.name}: ${item.image_url}`);
        });
        
        console.log('\n✅ Test complete. Image URLs shown above.');
        console.log('Pre-Built images should be served from: http://localhost:5000/uploads/prebuilt/...');
        console.log('Monitor images should be served from: http://localhost:5000/assets/parts/monitor/...');
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

testImagePaths();
