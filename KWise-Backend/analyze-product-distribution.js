const builds = require('./ai/utils/referenceBuilds');

console.log('📊 REFERENCE BUILDS PRODUCT USAGE ANALYSIS');
console.log('=' .repeat(80));

const productIds = new Set();
const productUsageCount = {};
const categoryUsage = {};
let totalComponents = 0;
let buildsWithGPU = 0;
let buildsWithoutGPU = 0;

Object.entries(builds).forEach(([buildKey, build]) => {
    const hasGPU = build.components.GPU ? true : false;
    if (hasGPU) buildsWithGPU++;
    else buildsWithoutGPU++;
    
    const componentCount = Object.keys(build.components).length;
    totalComponents += componentCount;
    
    Object.entries(build.components).forEach(([category, comp]) => {
        if (comp.productId) {
            productIds.add(comp.productId);
            productUsageCount[comp.productId] = (productUsageCount[comp.productId] || 0) + 1;
            
            if (!categoryUsage[category]) {
                categoryUsage[category] = { products: new Set(), totalUsage: 0 };
            }
            categoryUsage[category].products.add(comp.productId);
            categoryUsage[category].totalUsage++;
        }
    });
});

console.log('\n🏗️  BUILD STRUCTURE:');
console.log(`   Total Builds: ${Object.keys(builds).length}`);
console.log(`   Builds WITH GPU: ${buildsWithGPU} (8 components each = ${buildsWithGPU * 8} slots)`);
console.log(`   Builds WITHOUT GPU: ${buildsWithoutGPU} (7 components each = ${buildsWithoutGPU * 7} slots)`);
console.log(`   Total Component Slots: ${totalComponents}`);
console.log(`   Expected Slots (72 builds): ${buildsWithGPU * 8 + buildsWithoutGPU * 7}`);

console.log('\n📦 PRODUCT USAGE:');
console.log(`   Total Unique Products Used: ${productIds.size}`);
console.log(`   Total Component Placements: ${totalComponents}`);

console.log('\n📋 CATEGORY BREAKDOWN:');
Object.entries(categoryUsage).sort((a, b) => a[0].localeCompare(b[0])).forEach(([category, data]) => {
    console.log(`   ${category}:`);
    console.log(`      Unique Products: ${data.products.size}`);
    console.log(`      Total Usage: ${data.totalUsage} times`);
    console.log(`      Avg Usage per Product: ${(data.totalUsage / data.products.size).toFixed(2)}`);
});

const sortedProducts = Object.entries(productUsageCount).sort((a, b) => b[1] - a[1]);

console.log('\n🔝 MOST USED PRODUCTS (Top 15):');
sortedProducts.slice(0, 15).forEach(([id, count]) => {
    console.log(`   Product ID ${id}: used ${count} times`);
});

console.log('\n🔻 LEAST USED PRODUCTS (Bottom 15):');
sortedProducts.slice(-15).forEach(([id, count]) => {
    console.log(`   Product ID ${id}: used ${count} times`);
});

// Find products used more than expected
const maxExpectedUsage = Math.ceil(Object.keys(builds).length / productIds.size);
const overusedProducts = sortedProducts.filter(([id, count]) => count > maxExpectedUsage * 2);

console.log('\n⚠️  OVERUSED PRODUCTS (Used > ' + (maxExpectedUsage * 2) + ' times):');
if (overusedProducts.length > 0) {
    overusedProducts.forEach(([id, count]) => {
        console.log(`   Product ID ${id}: used ${count} times (${((count/72)*100).toFixed(1)}% of builds)`);
    });
} else {
    console.log('   ✅ No products are significantly overused');
}

console.log('\n' + '='.repeat(80));
