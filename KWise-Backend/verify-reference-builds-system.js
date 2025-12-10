/**
 * COMPREHENSIVE VERIFICATION TEST
 * Tests the database-backed reference builds system end-to-end
 */

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

const API_BASE_URL = 'http://localhost:5000';

async function verifyDatabaseProducts() {
    console.log('\n🔍 STEP 1: VERIFYING DATABASE PRODUCTS...\n');
    
    const categories = ['CPU', 'GPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling'];
    const results = {};
    
    for (const category of categories) {
        const result = await pool.query(`
            SELECT COUNT(*) as count,
                   MIN(price) as min_price,
                   MAX(price) as max_price,
                   AVG(price) as avg_price
            FROM pc_parts
            WHERE category = $1
                AND is_active = true
                AND kiosk_visible = true
                AND stock > 0
        `, [category]);
        
        const data = result.rows[0];
        results[category] = {
            count: parseInt(data.count),
            minPrice: parseFloat(data.min_price),
            maxPrice: parseFloat(data.max_price),
            avgPrice: parseFloat(data.avg_price)
        };
        
        const status = data.count > 0 ? '✅' : '❌';
        console.log(`${status} ${category.padEnd(15)} ${data.count} products | ₱${Math.round(data.min_price).toLocaleString()} - ₱${Math.round(data.max_price).toLocaleString()}`);
    }
    
    return results;
}

async function verifyReferenceBuilds() {
    console.log('\n🔍 STEP 2: VERIFYING REFERENCE BUILDS MODULE...\n');
    
    try {
        const referenceBuilds = require('./ai/utils/referenceBuilds');
        const buildKeys = Object.keys(referenceBuilds);
        
        console.log(`✅ Reference builds loaded: ${buildKeys.length} builds`);
        
        // Check if builds use database products
        let buildsWithProductIds = 0;
        let buildsWithoutProductIds = 0;
        
        for (const [key, build] of Object.entries(referenceBuilds)) {
            let hasProductIds = true;
            for (const [component, details] of Object.entries(build.components)) {
                if (!details.productId || details.productId === null) {
                    hasProductIds = false;
                    break;
                }
            }
            
            if (hasProductIds) {
                buildsWithProductIds++;
            } else {
                buildsWithoutProductIds++;
            }
        }
        
        console.log(`✅ Builds with product IDs: ${buildsWithProductIds}`);
        console.log(`⚠️  Builds without product IDs: ${buildsWithoutProductIds}`);
        
        // Sample one build
        const sampleKey = 'gaming_2021-2025_26000-50000';
        if (referenceBuilds[sampleKey]) {
            const sample = referenceBuilds[sampleKey];
            console.log(`\n📦 Sample Build: ${sampleKey}`);
            console.log(`   Usage: ${sample.usage}`);
            console.log(`   Budget: ₱${sample.actualBudget?.toLocaleString() || 'N/A'}`);
            console.log(`   Components:`);
            
            for (const [component, details] of Object.entries(sample.components)) {
                const productId = details.productId || 'N/A';
                const price = details.price ? `₱${details.price.toLocaleString()}` : 'N/A';
                console.log(`     - ${component}: ${details.name} (ID: ${productId}, Price: ${price})`);
            }
        }
        
        return {
            totalBuilds: buildKeys.length,
            buildsWithProductIds,
            buildsWithoutProductIds
        };
        
    } catch (error) {
        console.error('❌ Error loading reference builds:', error.message);
        return null;
    }
}

async function verifyAPIEndpoint() {
    console.log('\n🔍 STEP 3: VERIFYING API ENDPOINT...\n');
    
    const testCases = [
        { usage: 'Gaming', yearPurchased: 2018, budget: 40000, expected: 'gaming_2016-2020_26000-50000' },
        { usage: 'Content Creation', yearPurchased: 2023, budget: 65000, expected: 'content creation_2021-2025_51000-75000' },
        { usage: 'Office Work', yearPurchased: 2014, budget: 15000, expected: 'office work_2010-2015_10000-25000' }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/ai/estimate-current-build`, testCase, {
                timeout: 5000
            });
            
            if (response.data.success) {
                const matched = response.data.data.matched;
                const allMatched = Object.keys(matched).every(key => matched[key] !== null);
                
                if (allMatched) {
                    console.log(`✅ ${testCase.usage} (${testCase.yearPurchased}): All components matched`);
                    passed++;
                } else {
                    console.log(`⚠️  ${testCase.usage} (${testCase.yearPurchased}): Some components missing`);
                    failed++;
                }
            } else {
                console.log(`❌ ${testCase.usage} (${testCase.yearPurchased}): Request failed`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${testCase.usage} (${testCase.yearPurchased}): ${error.message}`);
            failed++;
        }
    }
    
    return { passed, failed };
}

async function verifyProductAvailability() {
    console.log('\n🔍 STEP 4: VERIFYING PRODUCT AVAILABILITY IN BUILDS...\n');
    
    try {
        const referenceBuilds = require('./ai/utils/referenceBuilds');
        
        let totalProducts = 0;
        let availableProducts = 0;
        let unavailableProducts = 0;
        
        for (const [buildKey, build] of Object.entries(referenceBuilds)) {
            for (const [component, details] of Object.entries(build.components)) {
                if (details.productId && details.productId !== null) {
                    totalProducts++;
                    
                    // Check if product exists and is available in database
                    const result = await pool.query(`
                        SELECT id, name, stock, is_active, kiosk_visible
                        FROM pc_parts
                        WHERE id = $1
                    `, [details.productId]);
                    
                    if (result.rows.length > 0) {
                        const product = result.rows[0];
                        if (product.is_active && product.kiosk_visible && product.stock > 0) {
                            availableProducts++;
                        } else {
                            unavailableProducts++;
                            console.log(`   ⚠️  Product ${details.productId} (${component} in ${buildKey}): ${product.stock === 0 ? 'Out of stock' : 'Not active/visible'}`);
                        }
                    } else {
                        unavailableProducts++;
                        console.log(`   ❌ Product ${details.productId} (${component} in ${buildKey}): Not found in database`);
                    }
                }
            }
        }
        
        console.log(`\n📊 Product Availability Summary:`);
        console.log(`   Total referenced products: ${totalProducts}`);
        console.log(`   ✅ Available: ${availableProducts} (${((availableProducts/totalProducts)*100).toFixed(1)}%)`);
        console.log(`   ❌ Unavailable: ${unavailableProducts} (${((unavailableProducts/totalProducts)*100).toFixed(1)}%)`);
        
        return {
            totalProducts,
            availableProducts,
            unavailableProducts
        };
        
    } catch (error) {
        console.error('❌ Error verifying product availability:', error.message);
        return null;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE REFERENCE BUILDS VERIFICATION');
    console.log('  Database-Backed PC Upgrade System Test');
    console.log('═══════════════════════════════════════════════════════');
    
    try {
        // Step 1: Verify database products
        const dbProducts = await verifyDatabaseProducts();
        
        // Step 2: Verify reference builds module
        const buildStats = await verifyReferenceBuilds();
        
        // Step 3: Verify API endpoint
        const apiResults = await verifyAPIEndpoint();
        
        // Step 4: Verify product availability
        const availabilityStats = await verifyProductAvailability();
        
        // Final summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  FINAL VERIFICATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');
        
        const totalCategories = Object.keys(dbProducts).length;
        const categoriesWithStock = Object.values(dbProducts).filter(c => c.count > 0).length;
        
        console.log(`Database Products:     ${categoriesWithStock}/${totalCategories} categories have stock`);
        console.log(`Reference Builds:      ${buildStats?.totalBuilds || 0} builds generated`);
        console.log(`  - With Product IDs:  ${buildStats?.buildsWithProductIds || 0}`);
        console.log(`  - Without IDs:       ${buildStats?.buildsWithoutProductIds || 0}`);
        console.log(`API Tests:             ${apiResults.passed}/${apiResults.passed + apiResults.failed} passed`);
        console.log(`Product Availability:  ${availabilityStats?.availableProducts || 0}/${availabilityStats?.totalProducts || 0} available`);
        
        const allGood = 
            categoriesWithStock === totalCategories &&
            buildStats?.totalBuilds === 72 &&
            apiResults.passed === apiResults.passed + apiResults.failed &&
            (availabilityStats?.availableProducts || 0) > (availabilityStats?.totalProducts || 0) * 0.9;
        
        if (allGood) {
            console.log('\n✅ VERIFICATION PASSED - System is working correctly!');
        } else {
            console.log('\n⚠️  VERIFICATION COMPLETED WITH WARNINGS');
            console.log('    Please review the issues above');
        }
        
    } catch (error) {
        console.error('\n❌ VERIFICATION FAILED:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

main();
