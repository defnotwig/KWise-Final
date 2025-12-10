const db = require('../config/db');

async function checkPreBuiltAndMonitors() {
    try {
        console.log('=== PRE-BUILT PRODUCTS ===\n');
        
        // Query Pre-Built products
        const prebuiltResult = await db.query(`
            SELECT id, name, price, stock, image_url, specifications
            FROM pc_parts 
            WHERE category = 'Pre-Built' 
            ORDER BY id 
            LIMIT 5
        `);
        
        prebuiltResult.rows.forEach(item => {
            console.log(`\nID: ${item.id}`);
            console.log(`Name: ${item.name}`);
            console.log(`Price: ${item.price}`);
            console.log(`Stock: ${item.stock}`);
            console.log(`Image URL: ${item.image_url}`);
            console.log(`Build Type: ${item.specifications?.buildType || 'N/A'}`);
            console.log(`Components Count: ${item.specifications?.components?.length || 0}`);
            console.log(`Component Links Count: ${item.specifications?.componentLinks?.length || 0}`);
            
            // Show first component example
            if (item.specifications?.components?.[0]) {
                const comp = item.specifications.components[0];
                console.log(`First Component: ${comp.type} - ${comp.value}`);
            }
            
            // Show first component link example
            if (item.specifications?.componentLinks?.[0]) {
                const link = item.specifications.componentLinks[0];
                console.log(`First Link: ${link.componentType} - IDs: ${link.linkedStockIds?.join(', ') || 'none'}`);
            }
        });
        
        console.log('\n\n=== MONITOR PRODUCTS ===\n');
        
        // Query Monitor products
        const monitorResult = await db.query(`
            SELECT id, name, price, stock, category
            FROM pc_parts 
            WHERE category = 'Monitor' 
            ORDER BY price 
            LIMIT 10
        `);
        
        console.log(`Total Monitors Found: ${monitorResult.rows.length}\n`);
        
        monitorResult.rows.forEach(monitor => {
            console.log(`ID: ${monitor.id} | ${monitor.name} | ₱${monitor.price} | Stock: ${monitor.stock}`);
        });
        
        console.log('\n\n=== SUMMARY ===');
        console.log(`Pre-Built Products: ${prebuiltResult.rows.length}`);
        console.log(`Monitor Products: ${monitorResult.rows.length}`);
        
        await db.end();
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkPreBuiltAndMonitors();
