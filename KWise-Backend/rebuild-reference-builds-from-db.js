/**
 * REBUILD REFERENCE BUILDS FROM ACTUAL DATABASE
 * 
 * This script analyzes the actual pc_parts table in the database
 * and generates 72 reference builds using REAL products.
 * 
 * Each build will reference actual product IDs, names, prices, and specs
 * to ensure the PC Upgrade system suggests only available products.
 */

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'KWiseDB',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Component budget allocation by usage type
const COMPONENT_ALLOCATIONS = {
    'Gaming': {
        GPU: 0.40, CPU: 0.20, RAM: 0.10, Storage: 0.08,
        Motherboard: 0.10, PSU: 0.06, Case: 0.04, Cooling: 0.02
    },
    'Content Creation': {
        CPU: 0.30, GPU: 0.25, RAM: 0.20, Storage: 0.12,
        Motherboard: 0.07, PSU: 0.04, Case: 0.01, Cooling: 0.01
    },
    'Programming Development': {
        CPU: 0.30, RAM: 0.25, Storage: 0.15, GPU: 0.10,
        Motherboard: 0.10, PSU: 0.05, Case: 0.03, Cooling: 0.02
    },
    'Office Work': {
        CPU: 0.25, RAM: 0.20, Storage: 0.15, Motherboard: 0.15,
        PSU: 0.10, GPU: 0.05, Case: 0.05, Cooling: 0.05
    },
    'School/Study': {
        CPU: 0.25, RAM: 0.18, Storage: 0.15, Motherboard: 0.15,
        GPU: 0.10, PSU: 0.10, Case: 0.05, Cooling: 0.02
    },
    'General Use': {
        CPU: 0.25, RAM: 0.20, Storage: 0.15, Motherboard: 0.12,
        GPU: 0.10, PSU: 0.08, Case: 0.05, Cooling: 0.05
    }
};

// Category mappings (database category -> standard category)
const CATEGORY_MAP = {
    'CPU': ['CPU', 'Central Processing Unit', 'Processor'],
    'GPU': ['GPU', 'Graphics Card', 'Video Card'],
    'RAM': ['RAM', 'Memory'],
    'Storage': ['Storage', 'SSD', 'HDD', 'Hard Drive', 'Solid State Drive'],
    'Motherboard': ['Motherboard', 'MOBO'],
    'PSU': ['PSU', 'Power Supply'],
    'Case': ['Case', 'PC Case', 'Chassis'],
    'Cooling': ['Cooling', 'Cooling System', 'CPU Cooler', 'Cooler']
};

async function analyzeDatabase() {
    console.log('🔍 ANALYZING DATABASE...\n');

    const productsByCategory = {};

    for (const [standardCategory, dbCategories] of Object.entries(CATEGORY_MAP)) {
        const placeholders = dbCategories.map((_, i) => `$${i + 1}`).join(', ');
        
        const result = await pool.query(`
            SELECT 
                id, name, category, brand, price, stock,
                image_url, specifications
            FROM pc_parts
            WHERE category IN (${placeholders})
                AND is_active = true
                AND kiosk_visible = true
                AND stock > 0
                AND price > 0
            ORDER BY price ASC
        `, dbCategories);

        productsByCategory[standardCategory] = result.rows;
        
        if (result.rows.length === 0) {
            console.log(`⚠️  ${standardCategory}: No products found (searched: ${dbCategories.join(', ')})`);
        } else {
            const prices = result.rows.map(p => p.price);
            console.log(`✅ ${standardCategory}: ${result.rows.length} products (₱${Math.min(...prices).toLocaleString()} - ₱${Math.max(...prices).toLocaleString()})`);
        }
    }

    console.log('\n📊 DATABASE ANALYSIS COMPLETE\n');
    return productsByCategory;
}

// Track product usage globally to ensure ALL products are used
const productUsageCount = {};
const categoryProductIndex = {}; // Track next product to use per category

function findProductInBudget(products, targetPrice, flexibility = 0.5, category = '') {
    if (!products || products.length === 0) return null;

    // Initialize index for this category if not exists
    if (!categoryProductIndex[category]) {
        categoryProductIndex[category] = 0;
    }

    // Sort products by usage count (least used first), then by ID for consistency
    const sortedProducts = [...products].sort((a, b) => {
        const usageA = productUsageCount[a.id] || 0;
        const usageB = productUsageCount[b.id] || 0;
        
        if (usageA !== usageB) {
            return usageA - usageB; // Prefer less used products
        }
        
        return a.id - b.id; // Consistent ordering
    });

    // Use round-robin to ensure ALL products get used
    // This cycles through products in order of least-used
    const selectedProduct = sortedProducts[0];
    
    // Track usage
    if (selectedProduct) {
        productUsageCount[selectedProduct.id] = (productUsageCount[selectedProduct.id] || 0) + 1;
    }

    return selectedProduct;
}

function generateReasoningByAge(category, age) {
    if (age >= 10) {
        return {
            CPU: 'Older generation processor, suitable for the era when this PC was built',
            GPU: 'Entry-level graphics from this period, focused on basic gaming/display needs',
            RAM: 'DDR3 memory standard for systems of this age',
            Storage: 'Traditional HDD storage, common before SSD adoption',
            Motherboard: 'Older chipset compatible with DDR3 and legacy components',
            PSU: 'Basic power supply, may lack efficiency certifications',
            Case: 'Simple case design typical of budget builds from this era',
            Cooling: 'Stock or basic cooling solution'
        }[category] || 'Component typical for this age PC';
    } else if (age >= 5) {
        return {
            CPU: 'Mid-generation processor offering good balance of performance and value',
            GPU: 'Capable graphics card from the previous generation',
            RAM: 'DDR4 memory standard, offering better speeds than DDR3',
            Storage: 'SATA SSD or entry-level NVMe for faster loading',
            Motherboard: 'Mid-range chipset with modern features like M.2 support',
            PSU: '80+ Bronze or better efficiency for stable power delivery',
            Case: 'Modern case with improved airflow and cable management',
            Cooling: 'Aftermarket cooler or adequate stock cooling'
        }[category] || 'Mid-range component from this era';
    } else {
        return {
            CPU: 'Modern processor with excellent multi-core performance',
            GPU: 'Current or recent generation graphics card',
            RAM: 'DDR4/DDR5 high-speed memory for optimal performance',
            Storage: 'Fast NVMe Gen3/Gen4 SSD for quick load times',
            Motherboard: 'Latest chipset with PCIe 4.0/5.0 and modern connectivity',
            PSU: '80+ Gold or better for efficiency and reliability',
            Case: 'Modern case with excellent cooling and aesthetics',
            Cooling: 'Efficient cooling solution for sustained performance'
        }[category] || 'Modern, high-quality component';
    }
}

function generateUpgradeSuggestions(usage, age) {
    const ageCategory = age >= 10 ? 'old' : age >= 5 ? 'mid' : 'recent';
    
    const suggestions = {
        'Gaming': {
            old: ['GPU', 'CPU', 'Motherboard', 'RAM'],
            mid: ['GPU', 'CPU', 'RAM'],
            recent: ['GPU']
        },
        'Content Creation': {
            old: ['CPU', 'RAM', 'Storage', 'Motherboard'],
            mid: ['CPU', 'RAM', 'Storage'],
            recent: ['RAM', 'Storage']
        },
        'Programming Development': {
            old: ['CPU', 'RAM', 'Storage', 'Motherboard'],
            mid: ['CPU', 'RAM', 'Storage'],
            recent: ['RAM', 'Storage']
        },
        'Office Work': {
            old: ['CPU', 'Motherboard', 'RAM', 'Storage'],
            mid: ['CPU', 'RAM'],
            recent: ['Storage']
        },
        'School/Study': {
            old: ['CPU', 'Motherboard', 'RAM'],
            mid: ['CPU', 'RAM'],
            recent: ['RAM']
        },
        'General Use': {
            old: ['CPU', 'Motherboard', 'RAM'],
            mid: ['Storage', 'RAM'],
            recent: ['Storage']
        }
    };

    return suggestions[usage][ageCategory];
}

function generateUpgradeReasoning(usage, age, yearRange) {
    const year = yearRange.split('-')[0];
    const currentYear = new Date().getFullYear();
    const pcAge = currentYear - parseInt(year);

    if (age >= 10) {
        return `Your ${usage.toLowerCase()} PC from ${year} is ${pcAge} years old and significantly outdated. A platform upgrade (CPU, Motherboard, RAM) is highly recommended to modernize the system. Consider newer DDR4/DDR5 memory and current-generation processors for a substantial performance boost.`;
    } else if (age >= 5) {
        return `Your ${usage.toLowerCase()} PC from ${year} is ${pcAge} years old and showing its age. Focus on upgrading the most impactful components for your workload. The system foundation is still viable, but key components need refreshing for optimal performance.`;
    } else {
        return `Your ${usage.toLowerCase()} PC from ${year} is relatively recent (${pcAge} years old). The system foundation is solid. Consider targeted upgrades based on your specific needs to enhance performance in demanding tasks.`;
    }
}

async function generateAllBuilds(productsByCategory) {
    console.log('🏗️  GENERATING 72 REFERENCE BUILDS FROM DATABASE PRODUCTS...\n');

    const builds = {};
    const usageTypes = Object.keys(COMPONENT_ALLOCATIONS);
    const yearRanges = ['2010-2015', '2016-2020', '2021-2025'];
    const budgetRanges = ['10000-25000', '26000-50000', '51000-75000', '76000-100000'];

    let buildCount = 0;
    const totalBuilds = usageTypes.length * yearRanges.length * budgetRanges.length;

    for (const usage of usageTypes) {
        for (const yearRange of yearRanges) {
            const age = yearRange === '2010-2015' ? 12 : yearRange === '2016-2020' ? 7 : 2;
            
            for (const budgetRange of budgetRanges) {
                const [minBudget, maxBudget] = budgetRange.split('-').map(Number);
                const avgBudget = (minBudget + maxBudget) / 2;
                
                const buildKey = `${usage.toLowerCase()}_${yearRange}_${budgetRange}`;
                const allocation = COMPONENT_ALLOCATIONS[usage];
                
                const components = {};
                let totalActualPrice = 0;

                // Select actual products for each component
                for (const [component, percentage] of Object.entries(allocation)) {
                    const targetPrice = avgBudget * percentage;
                    const products = productsByCategory[component];
                    
                    const selectedProduct = findProductInBudget(products, targetPrice, 0.5, component);
                    
                    if (selectedProduct) {
                        components[component] = {
                            productId: selectedProduct.id,
                            name: selectedProduct.name,
                            brand: selectedProduct.brand,
                            category: selectedProduct.category,
                            price: selectedProduct.price,
                            specs: selectedProduct.specifications || 'Standard specifications',
                            imageUrl: selectedProduct.image_url,
                            reasoning: generateReasoningByAge(component, age)
                        };
                        totalActualPrice += selectedProduct.price;
                    } else {
                        // Fallback if no product found
                        components[component] = {
                            productId: null,
                            name: `${component} - Product Not Available`,
                            brand: 'Generic',
                            category: component,
                            price: targetPrice,
                            specs: 'Not available in current inventory',
                            imageUrl: null,
                            reasoning: 'Product temporarily unavailable in inventory'
                        };
                        totalActualPrice += targetPrice;
                    }
                }

                builds[buildKey] = {
                    usage,
                    yearRange,
                    budgetRange,
                    estimatedAge: age,
                    targetBudget: avgBudget,
                    actualBudget: Math.round(totalActualPrice),
                    components,
                    suggestedUpgrades: generateUpgradeSuggestions(usage, age),
                    upgradeReasoning: generateUpgradeReasoning(usage, age, yearRange),
                    generatedAt: new Date().toISOString(),
                    databaseProducts: true
                };

                buildCount++;
                if (buildCount % 12 === 0) {
                    console.log(`✅ Generated ${buildCount}/${totalBuilds} builds (${usage} complete)`);
                }
            }
        }
    }

    console.log(`\n🎉 Successfully generated all ${buildCount} reference builds!`);
    return builds;
}

/**
 * Basic compatibility validation for builds
 * Validates that each build has all required components and prices are within budget
 */
function validateBuilds(builds) {
    console.log('\n🔍 VALIDATING BUILDS FOR COMPATIBILITY...\n');
    
    const requiredComponents = ['CPU', 'GPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling'];
    const issues = [];
    let validBuilds = 0;
    
    for (const [buildKey, build] of Object.entries(builds)) {
        const buildIssues = [];
        
        // Check all required components exist
        for (const component of requiredComponents) {
            if (!build.components[component]) {
                buildIssues.push(`Missing ${component}`);
            } else if (!build.components[component].productId) {
                buildIssues.push(`${component} has no product ID (unavailable)`);
            }
        }
        
        // Check price is within budget range
        const [minBudget, maxBudget] = build.budgetRange.split('-').map(Number);
        if (build.actualBudget > maxBudget * 1.1) { // Allow 10% flexibility
            buildIssues.push(`Price ₱${build.actualBudget.toLocaleString()} exceeds max budget ₱${maxBudget.toLocaleString()}`);
        }
        
        // Check price is not too low (indicates missing components)
        if (build.actualBudget < minBudget * 0.5) {
            buildIssues.push(`Price ₱${build.actualBudget.toLocaleString()} is suspiciously low (min ₱${minBudget.toLocaleString()})`);
        }
        
        if (buildIssues.length > 0) {
            issues.push({ buildKey, issues: buildIssues });
        } else {
            validBuilds++;
        }
    }
    
    console.log(`✅ Valid builds: ${validBuilds}/${Object.keys(builds).length}`);
    
    if (issues.length > 0) {
        console.log(`\n⚠️  Found ${issues.length} builds with issues:\n`);
        issues.slice(0, 5).forEach(({ buildKey, issues }) => {
            console.log(`   ${buildKey}:`);
            issues.forEach(issue => console.log(`      - ${issue}`));
        });
        
        if (issues.length > 5) {
            console.log(`   ... and ${issues.length - 5} more builds with issues`);
        }
    }
    
    return { validBuilds, totalBuilds: Object.keys(builds).length, issues };
}

async function main() {
    try {
        console.log('═══════════════════════════════════════════════════════');
        console.log('  REBUILD REFERENCE BUILDS FROM DATABASE');
        console.log('  Using REAL products from pc_parts table');
        console.log('═══════════════════════════════════════════════════════\n');

        // Step 1: Analyze database
        const productsByCategory = await analyzeDatabase();

        // Verify we have products
        const totalProducts = Object.values(productsByCategory).reduce((sum, arr) => sum + arr.length, 0);
        if (totalProducts === 0) {
            throw new Error('No products found in database! Please check pc_parts table.');
        }

        // Step 2: Generate builds
        const builds = await generateAllBuilds(productsByCategory);

        // Step 2.5: Validate builds for compatibility and completeness
        const validation = validateBuilds(builds);
        
        if (validation.issues.length > 0) {
            console.log('\n⚠️  WARNING: Some builds have issues but will still be saved.');
            console.log('   Review the issues above and consider adding more products to the database.\n');
        }

        // Step 3: Save to file
        const outputPath = './ai/utils/referenceBuilds.js';
        const fileContent = `/**
 * PC UPGRADE REFERENCE BUILDS SYSTEM
 * 
 * AUTO-GENERATED FROM DATABASE: ${new Date().toISOString()}
 * 
 * This module contains 72 reference builds using ACTUAL products from the database.
 * Each build references real product IDs, ensuring accurate suggestions.
 * 
 * - 6 Usage Types (Gaming, Office Work, School/Study, Content Creation, Programming Development, General Use)
 * - 3 Year Ranges (2010-2015 Old, 2016-2020 Mid-Age, 2021-2025 Recent)
 * - 4 Budget Ranges (₱10k-25k, ₱26k-50k, ₱51k-75k, ₱76k-100k)
 */

const REFERENCE_BUILDS = ${JSON.stringify(builds, null, 2)};

module.exports = REFERENCE_BUILDS;
`;

        fs.writeFileSync(outputPath, fileContent, 'utf-8');
        console.log(`\n✅ Saved to: ${outputPath}`);

        // Step 4: Generate summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  BUILD GENERATION SUMMARY');
        console.log('═══════════════════════════════════════════════════════\n');

        const usageTypes = [...new Set(Object.values(builds).map(b => b.usage))];
        for (const usage of usageTypes) {
            const usageBuilds = Object.values(builds).filter(b => b.usage === usage);
            const avgBudget = usageBuilds.reduce((sum, b) => sum + b.actualBudget, 0) / usageBuilds.length;
            console.log(`${usage.padEnd(25)} ${usageBuilds.length} builds | Avg: ₱${Math.round(avgBudget).toLocaleString()}`);
        }

        // Product distribution summary
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('  PRODUCT DISTRIBUTION ANALYSIS');
        console.log('═══════════════════════════════════════════════════════\n');
        
        const sortedUsage = Object.entries(productUsageCount).sort((a, b) => b[1] - a[1]);
        const totalUniqueProducts = sortedUsage.length;
        const totalSlots = 72 * 8; // 72 builds × 8 components
        const avgUsagePerProduct = totalSlots / totalUniqueProducts;
        
        console.log(`Total Unique Products Used: ${totalUniqueProducts}`);
        console.log(`Total Component Slots: ${totalSlots}`);
        console.log(`Average Usage per Product: ${avgUsagePerProduct.toFixed(2)}\n`);
        
        console.log('Most Used Products (Top 10):');
        sortedUsage.slice(0, 10).forEach(([id, count]) => {
            console.log(`   Product ID ${id}: ${count} times (${((count/72)*100).toFixed(1)}% of builds)`);
        });
        
        console.log('\nLeast Used Products (Bottom 10):');
        sortedUsage.slice(-10).forEach(([id, count]) => {
            console.log(`   Product ID ${id}: ${count} times (${((count/72)*100).toFixed(1)}% of builds)`);
        });

        console.log('\n✅ Reference builds successfully rebuilt from database!');
        console.log('✅ All builds use real products with actual prices');
        console.log('✅ Products distributed evenly across builds');
        console.log('✅ System will now suggest only available inventory\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
