const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'KWiseDB',
    user: 'postgres',
    password: 'humbleludwig13'
});

// Function to calculate similarity percentage between two strings
function calculateSimilarity(str1, str2) {
    const normalize = (str) => str.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    const s1 = normalize(str1);
    const s2 = normalize(str2);
    
    if (s1 === s2) return 100;
    
    // Use Levenshtein distance for similarity
    const levenshtein = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    };
    
    const distance = levenshtein(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return Math.max(0, ((maxLength - distance) / maxLength) * 100);
}

// Extract products from PC-Parts.js
function extractPCPartsProducts() {
    const filePath = path.join(__dirname, '../K-Wise/src/kiosk/PC-Parts.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const products = [];
    
    // Look for product objects with name, price, and details
    const productRegex = /{\s*name:\s*["'`]([^"'`]+)["'`][^}]*price:\s*["'`]([^"'`]+)["'`][^}]*details:\s*["'`]([^"'`]*?)["'`]/g;
    let match;
    
    while ((match = productRegex.exec(content)) !== null) {
        products.push({
            name: match[1].trim(),
            price: match[2].trim(),
            details: match[3].trim(),
            source: 'PC-Parts.js',
            category: 'Component'
        });
    }
    
    return products;
}

// Extract products from ProductList.js
function extractProductListItems() {
    const filePath = path.join(__dirname, '../K-Wise/src/kiosk/ProductList.js');
    const content = fs.readFileSync(filePath, 'utf8');
    
    const products = [];
    
    // Look for prebuilt PC configurations
    const buildRegex = /{\s*id:\s*\d+,\s*name:\s*["'`]([^"'`]+)["'`][^}]*price:\s*(\d+)[^}]*category:\s*["'`]([^"'`]+)["'`]/g;
    let match;
    
    while ((match = buildRegex.exec(content)) !== null) {
        products.push({
            name: match[1].trim(),
            price: `PHP ${match[2]}`,
            category: match[3].trim(),
            source: 'ProductList.js (Prebuilt)',
            type: 'Prebuilt PC'
        });
    }
    
    // Extract components from builds
    const componentRegex = /{\s*name:\s*["'`]([^"'`]+)["'`],\s*value:\s*["'`]([^"'`]+)["'`]/g;
    while ((match = componentRegex.exec(content)) !== null) {
        if (match[1] !== 'name' && match[2]) {
            products.push({
                name: match[2].trim(),
                category: match[1].trim(),
                source: 'ProductList.js (Component)',
                type: 'Component'
            });
        }
    }
    
    // Extract addon items
    const addonRegex = /{\s*name:\s*["'`]([^"'`]+)["'`],\s*price:\s*(\d+)/g;
    while ((match = addonRegex.exec(content)) !== null) {
        products.push({
            name: match[1].trim(),
            price: `PHP ${match[2]}`,
            source: 'ProductList.js (Addon)',
            type: 'Addon'
        });
    }
    
    return products;
}

// Extract products from PCCustomized.js
function extractPCCustomizedProducts() {
    const filePath = path.join(__dirname, '../K-Wise/src/kiosk/PCCustomized.js');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const products = [];
        
        // Look for menuItems structure
        const productRegex = /{\s*name:\s*["'`]([^"'`]+)["'`][^}]*price:\s*["'`]([^"'`]+)["'`]/g;
        let match;
        
        while ((match = productRegex.exec(content)) !== null) {
            products.push({
                name: match[1].trim(),
                price: match[2].trim(),
                source: 'PCCustomized.js',
                type: 'Component'
            });
        }
        
        return products;
    } catch (error) {
        console.log('⚠️  PCCustomized.js not accessible, skipping...');
        return [];
    }
}

// Extract all service items from service-related files
function extractServiceItems() {
    const serviceFiles = [
        'PCCleaning.js',
        'PCCheckup.js', 
        'PCUpgrade.js',
        'FutureUpgrade.js'
    ];
    
    const services = [];
    
    serviceFiles.forEach(filename => {
        const filePath = path.join(__dirname, '../K-Wise/src/kiosk', filename);
        
        try {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // Look for service items with name and price
                const serviceRegex = /{\s*name:\s*["'`]([^"'`]+)["'`][^}]*price:\s*["'`]?([^"'`\},]+)["'`]?/g;
                let match;
                
                while ((match = serviceRegex.exec(content)) !== null) {
                    services.push({
                        name: match[1].trim(),
                        price: match[2].trim(),
                        source: filename,
                        type: 'Service'
                    });
                }
            }
        } catch (error) {
            console.log(`⚠️  ${filename} not accessible, skipping...`);
        }
    });
    
    return services;
}

// Get all database items
async function getDatabaseItems() {
    try {
        const result = await pool.query(`
            SELECT id, name, category, brand, price, description
            FROM pc_parts 
            WHERE is_active = true
            ORDER BY category, name
        `);
        
        return result.rows;
    } catch (error) {
        console.error('❌ Error fetching database items:', error);
        return [];
    }
}

// Find best matches for kiosk item in database
function findBestMatches(kioskItem, dbItems, threshold = 90) {
    const matches = [];
    
    dbItems.forEach(dbItem => {
        const similarity = calculateSimilarity(kioskItem.name, dbItem.name);
        if (similarity >= threshold) {
            matches.push({
                dbItem,
                similarity: Math.round(similarity * 100) / 100
            });
        }
    });
    
    return matches.sort((a, b) => b.similarity - a.similarity);
}

// Main analysis function
async function analyzeKioskVsDatabase() {
    console.log('🔍 KIOSK vs DATABASE COMPARISON ANALYSIS');
    console.log('==========================================\n');

    try {
        // Extract all kiosk data
        console.log('📊 Extracting kiosk data...');
        const pcPartsProducts = extractPCPartsProducts();
        const productListItems = extractProductListItems();
        const pcCustomizedProducts = extractPCCustomizedProducts();
        const serviceItems = extractServiceItems();
        
        const allKioskItems = [
            ...pcPartsProducts,
            ...productListItems,
            ...pcCustomizedProducts,
            ...serviceItems
        ];
        
        // Remove duplicates based on name
        const uniqueKioskItems = allKioskItems.reduce((acc, current) => {
            const existingItem = acc.find(item => 
                calculateSimilarity(item.name, current.name) > 95
            );
            if (!existingItem) {
                acc.push(current);
            }
            return acc;
        }, []);
        
        console.log(`✅ Extracted ${allKioskItems.length} total items (${uniqueKioskItems.length} unique)`);
        console.log(`   - PC-Parts.js: ${pcPartsProducts.length} products`);
        console.log(`   - ProductList.js: ${productListItems.length} items`);
        console.log(`   - PCCustomized.js: ${pcCustomizedProducts.length} products`);
        console.log(`   - Service files: ${serviceItems.length} services\n`);
        
        // Get database items
        console.log('📊 Loading database items...');
        const dbItems = await getDatabaseItems();
        console.log(`✅ Loaded ${dbItems.length} items from database\n`);
        
        // Analyze matches
        console.log('🔍 Analyzing matches (90%+ similarity)...\n');
        
        const existingItems = [];
        const missingItems = [];
        
        uniqueKioskItems.forEach(kioskItem => {
            const matches = findBestMatches(kioskItem, dbItems, 90);
            
            if (matches.length > 0) {
                existingItems.push({
                    kioskItem,
                    matches
                });
            } else {
                missingItems.push(kioskItem);
            }
        });
        
        // Generate report
        console.log('📋 COMPARISON RESULTS:');
        console.log('═'.repeat(50));
        console.log(`✅ EXISTING IN DATABASE: ${existingItems.length} items`);
        console.log(`❌ MISSING FROM DATABASE: ${missingItems.length} items`);
        console.log(`📊 TOTAL KIOSK ITEMS ANALYZED: ${uniqueKioskItems.length} items\n`);
        
        // Show existing items
        if (existingItems.length > 0) {
            console.log('✅ ITEMS EXISTING IN DATABASE (90%+ similarity):');
            console.log('─'.repeat(50));
            existingItems.forEach((item, index) => {
                const bestMatch = item.matches[0];
                console.log(`${index + 1}. ${item.kioskItem.name}`);
                console.log(`   📍 Source: ${item.kioskItem.source}`);
                console.log(`   🎯 Best match: ${bestMatch.dbItem.name} (${bestMatch.similarity}%)`);
                console.log(`   💾 DB ID: ${bestMatch.dbItem.id} | Category: ${bestMatch.dbItem.category}`);
                if (item.matches.length > 1) {
                    console.log(`   📝 Additional matches: ${item.matches.length - 1} items`);
                }
                console.log('');
            });
        }
        
        // Show missing items
        if (missingItems.length > 0) {
            console.log('❌ ITEMS MISSING FROM DATABASE:');
            console.log('─'.repeat(50));
            
            // Group by source for better organization
            const bySource = missingItems.reduce((acc, item) => {
                if (!acc[item.source]) acc[item.source] = [];
                acc[item.source].push(item);
                return acc;
            }, {});
            
            Object.entries(bySource).forEach(([source, items]) => {
                console.log(`\n📁 From ${source} (${items.length} items):`);
                items.forEach((item, index) => {
                    console.log(`   ${index + 1}. ${item.name}`);
                    if (item.price) console.log(`      💰 Price: ${item.price}`);
                    if (item.category) console.log(`      📂 Category: ${item.category}`);
                    if (item.type) console.log(`      🏷️  Type: ${item.type}`);
                });
            });
        }
        
        // Summary statistics
        console.log('\n📈 DETAILED STATISTICS:');
        console.log('─'.repeat(50));
        console.log(`Database Coverage: ${Math.round((existingItems.length / uniqueKioskItems.length) * 100)}%`);
        console.log(`Items to Add: ${missingItems.length}`);
        console.log(`Duplicate Detection: ${allKioskItems.length - uniqueKioskItems.length} duplicates removed`);
        
        // Category breakdown
        const kioskByCategory = uniqueKioskItems.reduce((acc, item) => {
            const cat = item.category || item.type || 'Uncategorized';
            if (!acc[cat]) acc[cat] = 0;
            acc[cat]++;
            return acc;
        }, {});
        
        console.log('\n📊 Kiosk Items by Category:');
        Object.entries(kioskByCategory).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} items`);
        });
        
        const dbByCategory = dbItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = 0;
            acc[item.category]++;
            return acc;
        }, {});
        
        console.log('\n💾 Database Items by Category:');
        Object.entries(dbByCategory).forEach(([category, count]) => {
            console.log(`   ${category}: ${count} items`);
        });
        
        await pool.end();
        console.log('\n🎯 Analysis complete!');
        
    } catch (error) {
        console.error('❌ Error during analysis:', error);
        await pool.end();
    }
}

analyzeKioskVsDatabase();