const { query } = require('./config/db');
const builds = require('./ai/utils/referenceBuilds');

async function analyzeProductGaps() {
    console.log('🔍 ANALYZING PRODUCT USAGE GAPS');
    console.log('=' .repeat(80));
    
    try {
        // Get all active products from database
        const result = await query(`
            SELECT id as product_id, name, category, brand as subcategory, price, stock
            FROM pc_parts
            WHERE is_active = true
            AND category IN ('GPU', 'CPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling')
            ORDER BY category, price
        `);
        
        const allProducts = result.rows;
        
        // Get products used in builds
        const productsInBuilds = new Set();
        Object.values(builds).forEach(build => {
            Object.values(build.components).forEach(comp => {
                if (comp.productId) {
                    productsInBuilds.add(comp.productId);
                }
            });
        });
        
        console.log('\n📊 DATABASE vs BUILDS:');
        console.log(`   Total Products in Database: ${allProducts.length}`);
        console.log(`   Products Used in Builds: ${productsInBuilds.size}`);
        console.log(`   Products NOT Used: ${allProducts.length - productsInBuilds.size}`);
        
        // Group by category
        const categoryStats = {};
        allProducts.forEach(product => {
            const cat = product.category;
            if (!categoryStats[cat]) {
                categoryStats[cat] = {
                    total: 0,
                    used: 0,
                    notUsed: 0,
                    notUsedProducts: []
                };
            }
            categoryStats[cat].total++;
            if (productsInBuilds.has(product.product_id)) {
                categoryStats[cat].used++;
            } else {
                categoryStats[cat].notUsed++;
                categoryStats[cat].notUsedProducts.push(product);
            }
        });
        
        console.log('\n📦 CATEGORY BREAKDOWN:');
        Object.entries(categoryStats).sort((a, b) => a[0].localeCompare(b[0])).forEach(([cat, stats]) => {
            const usagePercent = ((stats.used / stats.total) * 100).toFixed(1);
            console.log(`\n   ${cat}:`);
            console.log(`      Total Available: ${stats.total}`);
            console.log(`      Used in Builds: ${stats.used} (${usagePercent}%)`);
            console.log(`      NOT Used: ${stats.notUsed}`);
            
            if (stats.notUsedProducts.length > 0) {
                console.log(`      Unused Products (showing first 5):`);
                stats.notUsedProducts.slice(0, 5).forEach(p => {
                    console.log(`         - ${p.name} (₱${parseFloat(p.price).toLocaleString()}) [ID: ${p.product_id}]`);
                });
                if (stats.notUsedProducts.length > 5) {
                    console.log(`         ... and ${stats.notUsedProducts.length - 5} more`);
                }
            }
        });
        
        console.log('\n' + '='.repeat(80));
        process.exit(0);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

analyzeProductGaps();
