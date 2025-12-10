const db = require('../config/db');

async function checkCounts() {
    try {
        // Count Pre-Built products
        const prebuiltResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM pc_parts 
            WHERE category = 'Pre-Built'
        `);
        
        // Count Monitor products
        const monitorResult = await db.query(`
            SELECT COUNT(*) as count 
            FROM pc_parts 
            WHERE category = 'Monitor'
        `);
        
        // Get sample Pre-Built products
        const samplePrebuilt = await db.query(`
            SELECT id, name, price, image_url, specifications
            FROM pc_parts 
            WHERE category = 'Pre-Built'
            ORDER BY id
            LIMIT 3
        `);
        
        // Get sample Monitor products
        const sampleMonitors = await db.query(`
            SELECT id, name, price, image_url
            FROM pc_parts 
            WHERE category = 'Monitor'
            ORDER BY price
            LIMIT 5
        `);
        
        console.log('\n=== DATABASE COUNTS ===');
        console.log(`Pre-Built Products: ${prebuiltResult.rows[0].count}`);
        console.log(`Monitor Products: ${monitorResult.rows[0].count}`);
        
        console.log('\n=== SAMPLE PRE-BUILT ===');
        samplePrebuilt.rows.forEach(item => {
            console.log(`\nID: ${item.id}`);
            console.log(`Name: ${item.name}`);
            console.log(`Price: ₱${item.price}`);
            console.log(`Image: ${item.image_url}`);
            
            if (item.specifications?.components) {
                console.log('Components:');
                item.specifications.components.forEach(comp => {
                    console.log(`  - ${comp.type || 'Unknown'}: ${comp.value}`);
                });
            }
            
            if (item.specifications?.componentLinks) {
                console.log('Component Links:');
                item.specifications.componentLinks.slice(0, 2).forEach(link => {
                    console.log(`  - ${link.componentType}: IDs [${link.linkedStockIds?.join(', ') || 'none'}]`);
                });
            }
        });
        
        console.log('\n=== SAMPLE MONITORS ===');
        sampleMonitors.rows.forEach(monitor => {
            console.log(`ID: ${monitor.id} | ${monitor.name} | ₱${monitor.price} | ${monitor.image_url}`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkCounts();
