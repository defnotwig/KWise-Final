const { query } = require('./config/db');

async function analyzeProducts() {
    console.log('\n🔍 ANALYZING PC PARTS DATABASE...\n');
    
    // 1. Total products by category
    const categoryCount = await query(`
        SELECT category, COUNT(*) as count 
        FROM pc_parts 
        WHERE is_active = true 
        AND category IN ('GPU', 'CPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling')
        GROUP BY category 
        ORDER BY category
    `);
    
    console.log('📊 Total Products by Category:');
    categoryCount.rows.forEach(row => {
        console.log(`   ${row.category}: ${row.count} products`);
    });
    
    // 2. Check reference builds metadata
    const metadata = await query(`
        SELECT * FROM pc_upgrade_reference_builds_metadata 
        ORDER BY generated_at DESC NULLS LAST
        LIMIT 1
    `);
    
    console.log('\n📋 Reference Builds Metadata:');
    if (metadata.rows.length > 0) {
        const meta = metadata.rows[0];
        console.log(`   Total Builds: ${meta.total_builds}`);
        console.log(`   Generated At: ${meta.generated_at || 'Never'}`);
        console.log(`   Status: ${meta.status}`);
    } else {
        console.log('   No metadata found');
    }
    
    // 3. Check for Elite Build products
    const eliteProducts = await query(`
        SELECT id, name, category, brand, price, created_at
        FROM pc_parts
        WHERE name LIKE '%Elite Build%'
        AND is_active = true
        ORDER BY created_at DESC
    `);
    
    console.log('\n🏆 Elite Build Products:');
    if (eliteProducts.rows.length > 0) {
        eliteProducts.rows.forEach(p => {
            console.log(`   ✅ ${p.name} (${p.category}) - ₱${parseFloat(p.price).toLocaleString()}`);
            console.log(`      ID: ${p.id}, Brand: ${p.brand}, Created: ${p.created_at}`);
        });
    } else {
        console.log('   No Elite Build products found');
    }
    
    // 4. Check reference builds file
    console.log('\n📄 Reference Builds File:');
    try {
        const referenceBuilds = require('./ai/utils/referenceBuilds');
        const buildKeys = Object.keys(referenceBuilds);
        console.log(`   Total builds in file: ${buildKeys.length}`);
        
        // Check if any build uses Elite Build products
        let foundElite = false;
        for (const [key, build] of Object.entries(referenceBuilds)) {
            if (build.components && build.components.Case) {
                if (build.components.Case.name && build.components.Case.name.includes('Elite Build')) {
                    console.log(`   ✅ Found Elite Build in: ${key}`);
                    console.log(`      Case: ${build.components.Case.name} (ID: ${build.components.Case.productId})`);
                    foundElite = true;
                }
            }
        }
        
        if (!foundElite) {
            console.log('   ⚠️  No Elite Build products found in reference builds');
        }
        
        // Sample one build to check product IDs
        const sampleKey = buildKeys[0];
        const sampleBuild = referenceBuilds[sampleKey];
        console.log(`\n   Sample Build: ${sampleKey}`);
        console.log(`   Components:`);
        for (const [comp, details] of Object.entries(sampleBuild.components || {})) {
            console.log(`      ${comp}: ${details.name} (ID: ${details.productId || 'N/A'})`);
        }
        
    } catch (error) {
        console.log(`   Error reading reference builds: ${error.message}`);
    }
    
    process.exit(0);
}

analyzeProducts().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
