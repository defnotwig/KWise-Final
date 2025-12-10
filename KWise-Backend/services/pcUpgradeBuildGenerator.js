/**
 * PC UPGRADE BUILD GENERATOR SERVICE
 * 
 * Optimized build generation for PC Upgrade reference builds:
 * - Fast in-memory generation (30-60 seconds target)
 * - Uses actual database products with real prices
 * - Validates all components (7 for non-gaming, 8 for gaming with GPU)
 * - Round-robin distribution ensures product diversity
 * - Calculates accurate total prices
 * 
 * CORE COMPONENTS ONLY (8 categories):
 * - CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooling
 * - Excludes peripherals: Monitor, Mouse, Keyboard, Headphones, Webcam, Speakers, Pre-Built
 * 
 * BUDGET TIERS:
 * - Bronze: 10,000 - 25,000 PHP
 * - Silver: 26,000 - 50,000 PHP
 * - Gold: 51,000 - 75,000 PHP
 * - Platinum: 76,000 - 100,000 PHP
 * - Diamond: 100,000+ PHP
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Categories that must never be considered for reference builds
const EXCLUDED_NEW_PRODUCT_CATEGORIES = new Set([
    'Pre-Built',
    'Community Build',
    'Headphones',
    'Keyboard',
    'Monitor',
    'Mouse',
    'Speakers',
    'Webcam'
]);

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

// Gaming-focused usage types (require GPU)
const GAMING_USAGE_TYPES = ['Gaming', 'Content Creation'];

// Track product usage for round-robin distribution
const productUsageCount = {};

class PCUpgradeBuildGenerator {

    /**
     * Parse budget ranges from DB row or label and normalize values
     */
    static parseBudgetRange(budgetRangeRow = {}) {
        const label = budgetRangeRow.name || budgetRangeRow.budget_range || '';
        const explicitMin = Number(budgetRangeRow.min_budget);
        const explicitMax = Number(budgetRangeRow.max_budget);

        if (!Number.isNaN(explicitMin) && explicitMin > 0 && !Number.isNaN(explicitMax) && explicitMax > 0) {
            return { minBudget: explicitMin, maxBudget: explicitMax, label: label || `${explicitMin}-${explicitMax}` };
        }

        if (!Number.isNaN(explicitMin) && explicitMin > 0 && Number.isNaN(explicitMax)) {
            return { minBudget: explicitMin, maxBudget: Number.POSITIVE_INFINITY, label: label || `${explicitMin}+` };
        }

        const normalized = label.replace(/\s+/g, '').toLowerCase();
        if (normalized.includes('+')) {
            const min = Number(normalized.replace('+', ''));
            return { minBudget: Number.isFinite(min) && min > 0 ? min : 0, maxBudget: Number.POSITIVE_INFINITY, label: label || `${min}+` };
        }

        const [minRaw, maxRaw] = normalized.split('-');
        const minBudget = Number(minRaw);
        const maxBudget = Number(maxRaw);

        return {
            minBudget: Number.isFinite(minBudget) && minBudget > 0 ? minBudget : 0,
            maxBudget: Number.isFinite(maxBudget) && maxBudget > 0 ? maxBudget : Number.POSITIVE_INFINITY,
            label: label || `${minBudget}-${maxBudget}`
        };
    }

    /**
     * Compute a reasonable target budget for allocations even when max is open-ended
     */
    static computeTargetBudget(minBudget, maxBudget) {
        if (Number.isFinite(maxBudget)) {
            return (minBudget + maxBudget) / 2;
        }
        // For open-ended tiers, bias toward 25% above minimum
        return minBudget * 1.25;
    }
    
    /**
     * Main entry point - Generate all reference builds
     */
    static async generateAllBuilds() {
        const startTime = Date.now();
        logger.info('🚀 Starting PC Upgrade builds generation...');
        
        try {
            const existingBuilds = this.loadExistingBuilds();
            const existingProductIds = this.extractProductIds(existingBuilds);

            // Step 1: Fetch parameters from database
            const [usageTypes, yearRanges, budgetRanges] = await Promise.all([
                query('SELECT * FROM pc_upgrade_usage_types WHERE is_active = true ORDER BY sort_order'),
                query('SELECT * FROM pc_upgrade_year_ranges WHERE is_active = true ORDER BY sort_order'),
                query('SELECT * FROM pc_upgrade_budget_ranges WHERE is_active = true ORDER BY sort_order')
            ]);

            logger.info('📊 Parameters loaded:', {
                usageTypes: usageTypes.rows.length,
                yearRanges: yearRanges.rows.length,
                budgetRanges: budgetRanges.rows.length
            });

            // Step 2: Fetch all products by category (optimized single query per category)
            const productsByCategory = await this.fetchProductsByCategory(existingProductIds);
            const newProductIds = this.collectNewProductIds(productsByCategory);
            
            const totalProducts = Object.values(productsByCategory).reduce((sum, arr) => sum + arr.length, 0);
            logger.info(`📦 Loaded ${totalProducts} products from database`);

            if (totalProducts === 0) {
                throw new Error('No products found in database! Cannot generate builds.');
            }

            // Step 3: Generate builds
            const builds = await this.generateBuilds(
                usageTypes.rows,
                yearRanges.rows,
                budgetRanges.rows,
                productsByCategory,
                newProductIds
            );

            const mergedBuilds = this.mergeBuilds(existingBuilds, builds, newProductIds);

            // Step 4: Validate builds and drop any outside their budget tiers or missing components
            const validation = this.validateBuilds(mergedBuilds);
            logger.info(`✅ Validation: ${validation.validBuilds}/${validation.totalBuilds} builds valid`);

            let finalBuilds = mergedBuilds;
            if (validation.issues?.length) {
                const invalidKeys = new Set(validation.issues.map(issue => issue.buildKey));
                finalBuilds = Object.fromEntries(
                    Object.entries(mergedBuilds).filter(([key]) => !invalidKeys.has(key))
                );
                logger.warn('🧹 Removed builds failing budget/component checks', {
                    removed: invalidKeys.size,
                    remaining: Object.keys(finalBuilds).length
                });
            }

            const finalValidation = this.validateBuilds(finalBuilds);

            // Step 5: Save to file
            await this.saveBuildsToFile(finalBuilds);

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.info(`🎉 Build generation completed in ${duration}s`);

            return {
                success: true,
                totalBuilds: Object.keys(finalBuilds).length,
                validBuilds: finalValidation.validBuilds,
                duration: parseFloat(duration),
                productDistribution: this.getProductDistribution()
            };

        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            logger.error('❌ Build generation failed', { error: error.message, duration });
            throw error;
        }
    }

    /**
     * Fetch products by category (optimized)
     */
    static async fetchProductsByCategory(existingProductIds = new Set()) {
        const productsByCategory = {};

        for (const [standardCategory, dbCategories] of Object.entries(CATEGORY_MAP)) {
            const placeholders = dbCategories.map((_, i) => `$${i + 1}`).join(', ');
            
            const result = await query(`
                SELECT 
                    id, name, category, brand, price, stock,
                    image_url, specifications
                FROM pc_parts
                WHERE category IN (${placeholders})
                    AND stock > 0
                    AND price > 0
                ORDER BY price ASC
            `, dbCategories);

            productsByCategory[standardCategory] = result.rows.map(row => ({
                ...row,
                price: parseFloat(row.price),
                isNew: !existingProductIds.has(row.id)
            }));
            
            logger.info(`   ${standardCategory}: ${result.rows.length} products`);
        }

        return productsByCategory;
    }

    /**
     * Generate all builds based on parameters
     */
    static async generateBuilds(usageTypes, yearRanges, budgetRanges, productsByCategory, newProductIds = new Set()) {
        const builds = {};
        let buildCount = 0;
        const totalBuilds = usageTypes.length * yearRanges.length * budgetRanges.length;

        logger.info(`🏗️  Generating ${totalBuilds} builds...`);

        for (const usage of usageTypes) {
            const usageName = usage.name || usage.usage_type;
            const allocation = COMPONENT_ALLOCATIONS[usageName] || COMPONENT_ALLOCATIONS['General Use'];
            const isGamingUsage = GAMING_USAGE_TYPES.includes(usageName);

            for (const yearRange of yearRanges) {
                const yearRangeName = yearRange.name || yearRange.year_range;
                const age = this.calculateAge(yearRangeName);

                for (const budgetRange of budgetRanges) {
                    const { minBudget, maxBudget, label: budgetLabel } = this.parseBudgetRange(budgetRange);
                    const budgetRangeName = budgetRange.name || budgetRange.budget_range || budgetLabel;
                    if (!Number.isFinite(minBudget) || minBudget <= 0) {
                        logger.warn(`⚠️ Skipping budget range with invalid min: ${budgetRange.name || budgetRange.budget_range}`);
                        continue;
                    }

                    const avgBudget = this.computeTargetBudget(minBudget, maxBudget);
                    if (!Number.isFinite(avgBudget) || avgBudget <= 0) {
                        logger.warn(`⚠️ Unable to compute target budget for ${budgetRange.name || budgetRange.budget_range}`);
                        continue;
                    }

                    const buildKey = `${usageName.toLowerCase().replace(/\s+/g, '_')}_${yearRangeName}_${budgetRangeName}`;
                    
                    const components = {};
                    let totalActualPrice = 0;

                    // Select products for each component (all categories required)
                    for (const [component, percentage] of Object.entries(allocation)) {
                        const targetPrice = avgBudget * percentage;
                        const products = productsByCategory[component];
                        
                        const selectedProduct = this.findProductInBudget(products, targetPrice, component, newProductIds);
                        
                        if (selectedProduct) {
                            components[component] = {
                                productId: selectedProduct.id,
                                name: selectedProduct.name,
                                brand: selectedProduct.brand,
                                category: selectedProduct.category,
                                price: selectedProduct.price,
                                specs: selectedProduct.specifications || 'Standard specifications',
                                imageUrl: selectedProduct.image_url,
                                reasoning: this.generateReasoningByAge(component, age),
                                isNew: !!selectedProduct.isNew
                            };
                            totalActualPrice += selectedProduct.price;
                        }
                    }

                    const requiredCategories = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'Cooling'];
                    const missing = requiredCategories.filter(cat => !components[cat]);
                    if (missing.length) {
                        logger.warn(`⚠️ Skipping build ${buildKey} due to missing components: ${missing.join(', ')}`);
                        continue;
                    }

                    const balanced = this.rebalanceWithinBudget(components, minBudget, maxBudget, productsByCategory, newProductIds);

                    builds[buildKey] = {
                        usage: usageName,
                        yearRange: yearRangeName,
                        budgetRange: budgetLabel,
                        minBudget,
                        maxBudget,
                        estimatedAge: age,
                        targetBudget: avgBudget,
                        actualBudget: Math.round(balanced.total),
                        components: balanced.components,
                        isGamingBuild: isGamingUsage,
                        suggestedUpgrades: this.generateUpgradeSuggestions(usageName, age),
                        upgradeReasoning: this.generateUpgradeReasoning(usageName, age, yearRangeName),
                        generatedAt: new Date().toISOString(),
                        databaseProducts: true
                    };

                    buildCount++;
                    if (buildCount % 10 === 0) {
                        logger.info(`   Progress: ${buildCount}/${totalBuilds} builds (${Math.round(buildCount/totalBuilds*100)}%)`);
                    }
                }
            }
        }

        return builds;
    }

    /**
     * Find product that fits budget with PRICE FILTERING + ROUND-ROBIN
     * Strategy: Filter by price range, then pick least-used product
     */
    static findProductInBudget(products, targetPrice, category, newProductIds = new Set()) {
        if (!products || products.length === 0) return null;

        // TIER 1: Filter products within ±50% of target price (strict budget)
        let minPrice = targetPrice * 0.5;
        let maxPrice = targetPrice * 1.5;
        
        let filtered = products.filter(p => p.price >= minPrice && p.price <= maxPrice);

        if (filtered.length === 0) {
            // TIER 2: Expand to ±100% (flexible fallback)
            minPrice = targetPrice * 0.3;
            maxPrice = targetPrice * 2.0;
            filtered = products.filter(p => p.price >= minPrice && p.price <= maxPrice);
        }

        if (filtered.length === 0) {
            // TIER 3: Use all products (last resort)
            filtered = products;
        }

        // Sort by usage count (least used first) - ROUND-ROBIN
        const sortedProducts = [...filtered].sort((a, b) => {
            const isNewA = newProductIds.has(a.id) ? 1 : 0;
            const isNewB = newProductIds.has(b.id) ? 1 : 0;
            if (isNewA !== isNewB) {
                return isNewB - isNewA; // prefer new products
            }

            const usageA = productUsageCount[a.id] || 0;
            const usageB = productUsageCount[b.id] || 0;
            
            if (usageA !== usageB) {
                return usageA - usageB;
            }
            
            return a.id - b.id;
        });

        // Select least-used product within budget range
        const selectedProduct = sortedProducts[0];
        
        if (selectedProduct) {
            productUsageCount[selectedProduct.id] = (productUsageCount[selectedProduct.id] || 0) + 1;
        }

        return selectedProduct;
    }

    /**
     * Calculate PC age from year range
     */
    static calculateAge(yearRange) {
        const year = parseInt(yearRange.split('-')[0]);
        const currentYear = new Date().getFullYear();
        return currentYear - year;
    }

    /**
     * Generate reasoning based on age
     */
    static generateReasoningByAge(category, age) {
        if (age >= 10) {
            return {
                CPU: 'Older generation processor, suitable for the era when this PC was built',
                GPU: 'Entry-level graphics from this period',
                RAM: 'DDR3 memory standard for systems of this age',
                Storage: 'Traditional storage, common before SSD adoption',
                Motherboard: 'Older chipset compatible with legacy components',
                PSU: 'Basic power supply for this era',
                Case: 'Simple case design typical of budget builds',
                Cooling: 'Stock or basic cooling solution'
            }[category] || 'Component typical for this age PC';
        } else if (age >= 5) {
            return {
                CPU: 'Mid-generation processor offering good balance',
                GPU: 'Capable graphics card from previous generation',
                RAM: 'DDR4 memory standard, offering better speeds',
                Storage: 'SATA SSD or entry-level NVMe',
                Motherboard: 'Mid-range chipset with modern features',
                PSU: '80+ Bronze or better efficiency',
                Case: 'Modern case with improved airflow',
                Cooling: 'Aftermarket cooler or adequate stock cooling'
            }[category] || 'Mid-range component from this era';
        } else {
            return {
                CPU: 'Modern processor with excellent performance',
                GPU: 'Current or recent generation graphics card',
                RAM: 'DDR4/DDR5 high-speed memory',
                Storage: 'Fast NVMe Gen3/Gen4 SSD',
                Motherboard: 'Latest chipset with modern connectivity',
                PSU: '80+ Gold or better for efficiency',
                Case: 'Modern case with excellent cooling',
                Cooling: 'Efficient cooling solution'
            }[category] || 'Modern, high-quality component';
        }
    }

    /**
     * Generate upgrade suggestions
     */
    static generateUpgradeSuggestions(usage, age) {
        const ageCategory = age >= 10 ? 'old' : age >= 5 ? 'mid' : 'recent';
        
        const suggestions = {
            'Gaming': { old: ['GPU', 'CPU', 'Motherboard', 'RAM'], mid: ['GPU', 'CPU', 'RAM'], recent: ['GPU'] },
            'Content Creation': { old: ['CPU', 'RAM', 'Storage', 'Motherboard'], mid: ['CPU', 'RAM', 'Storage'], recent: ['RAM', 'Storage'] },
            'Programming Development': { old: ['CPU', 'RAM', 'Storage', 'Motherboard'], mid: ['CPU', 'RAM', 'Storage'], recent: ['RAM', 'Storage'] },
            'Office Work': { old: ['CPU', 'Motherboard', 'RAM', 'Storage'], mid: ['CPU', 'RAM'], recent: ['Storage'] },
            'School/Study': { old: ['CPU', 'Motherboard', 'RAM'], mid: ['CPU', 'RAM'], recent: ['RAM'] },
            'General Use': { old: ['CPU', 'Motherboard', 'RAM'], mid: ['Storage', 'RAM'], recent: ['Storage'] }
        };

        return suggestions[usage]?.[ageCategory] || ['CPU', 'RAM'];
    }

    /**
     * Generate upgrade reasoning
     */
    static generateUpgradeReasoning(usage, age, yearRange) {
        const year = yearRange.split('-')[0];
        if (age >= 10) {
            return `Your ${usage.toLowerCase()} PC from ${year} is significantly outdated. Platform upgrade recommended.`;
        } else if (age >= 5) {
            return `Your ${usage.toLowerCase()} PC from ${year} is showing its age. Focus on key component upgrades.`;
        } else {
            return `Your ${usage.toLowerCase()} PC from ${year} is relatively recent. Consider targeted upgrades.`;
        }
    }

    /**
     * Validate builds (7 components for non-gaming, 8 for gaming)
     */
    static validateBuilds(builds) {
        const requiredComponents = ['CPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling', 'GPU'];
        const issues = [];
        let validBuilds = 0;

        for (const [buildKey, build] of Object.entries(builds)) {
            const buildIssues = [];

            // Check all required components exist
            for (const component of requiredComponents) {
                if (!build.components[component]) {
                    buildIssues.push(`Missing ${component}`);
                } else if (!build.components[component].productId) {
                    buildIssues.push(`${component} has no product ID`);
                }
            }

            // Check price is within budget range
            const { minBudget, maxBudget } = this.parseBudgetRange({
                budget_range: build.budgetRange,
                min_budget: build.minBudget,
                max_budget: build.maxBudget
            });

            if (Number.isFinite(maxBudget) && build.actualBudget > maxBudget) {
                buildIssues.push(`Price ₱${build.actualBudget.toLocaleString()} exceeds max budget`);
            }
            if (Number.isFinite(minBudget) && build.actualBudget < minBudget) {
                buildIssues.push(`Price ₱${build.actualBudget.toLocaleString()} below min budget`);
            }

            if (buildIssues.length > 0) {
                issues.push({ buildKey, issues: buildIssues });
            } else {
                validBuilds++;
            }
        }

        return { validBuilds, totalBuilds: Object.keys(builds).length, issues };
    }

    static rebalanceWithinBudget(components, minBudget, maxBudget, productsByCategory, newProductIds = new Set()) {
        let currentComponents = { ...components };
        let total = Object.values(currentComponents)
            .filter(Boolean)
            .reduce((sum, comp) => sum + (parseFloat(comp.price) || 0), 0);

        const clampIterations = 12;
        let iter = 0;

        while (total > maxBudget && iter < clampIterations) {
            const [category] = Object.entries(currentComponents)
                .filter(([, comp]) => comp)
                .sort((a, b) => (parseFloat(b[1].price) || 0) - (parseFloat(a[1].price) || 0))[0] || [];
            if (!category) break;

            const options = (productsByCategory[category] || [])
                .filter(p => p.id !== currentComponents[category].productId)
                .sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));

            const cheaper = options.find(p => parseFloat(p.price) < parseFloat(currentComponents[category].price));
            if (!cheaper) break;

            currentComponents[category] = {
                productId: cheaper.id,
                name: cheaper.name,
                brand: cheaper.brand,
                category: cheaper.category,
                price: cheaper.price,
                specs: cheaper.specifications || 'Standard specifications',
                imageUrl: cheaper.image_url,
                reasoning: currentComponents[category].reasoning,
                isNew: newProductIds.has(cheaper.id)
            };

            total = Object.values(currentComponents)
                .filter(Boolean)
                .reduce((sum, comp) => sum + (parseFloat(comp.price) || 0), 0);
            iter++;
        }

        iter = 0;
        while (total < minBudget && iter < clampIterations) {
            const [category] = Object.entries(currentComponents)
                .filter(([, comp]) => comp)
                .sort((a, b) => (parseFloat(a[1].price) || 0) - (parseFloat(b[1].price) || 0))[0] || [];
            if (!category) break;

            const options = (productsByCategory[category] || [])
                .filter(p => p.id !== currentComponents[category].productId)
                .sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));

            const pricier = options.find(p => parseFloat(p.price) > parseFloat(currentComponents[category].price));
            if (!pricier) break;

            currentComponents[category] = {
                productId: pricier.id,
                name: pricier.name,
                brand: pricier.brand,
                category: pricier.category,
                price: pricier.price,
                specs: pricier.specifications || 'Standard specifications',
                imageUrl: pricier.image_url,
                reasoning: currentComponents[category].reasoning,
                isNew: newProductIds.has(pricier.id)
            };

            total = Object.values(currentComponents)
                .filter(Boolean)
                .reduce((sum, comp) => sum + (parseFloat(comp.price) || 0), 0);
            iter++;
        }

        return { components: currentComponents, total };
    }

    static loadExistingBuilds() {
        try {
            const buildsPath = path.join(__dirname, '../../ai/utils/referenceBuilds.js');
            delete require.cache[require.resolve(buildsPath)];
            const existing = require(buildsPath);
            return existing && typeof existing === 'object' ? existing : {};
        } catch (_err) {
            return {};
        }
    }

    static extractProductIds(builds) {
        const ids = new Set();
        Object.values(builds || {}).forEach(build => {
            Object.values(build.components || {}).forEach(comp => {
                if (comp?.productId) ids.add(comp.productId);
            });
        });
        return ids;
    }

    static collectNewProductIds(productsByCategory) {
        const ids = new Set();
        Object.values(productsByCategory || {}).forEach(list => {
            list.forEach(p => {
                if (p.isNew && !EXCLUDED_NEW_PRODUCT_CATEGORIES.has(p.category)) {
                    ids.add(p.id);
                }
            });
        });
        return ids;
    }

    static buildUsesNewProduct(build, newProductIds = new Set()) {
        return Object.values(build.components || {}).some(comp => comp?.productId && newProductIds.has(comp.productId));
    }

    static makeUniqueKey(baseKey, existingKeys) {
        if (!existingKeys.has(baseKey)) return baseKey;
        let counter = 2;
        let candidate = `${baseKey}-v${counter}`;
        while (existingKeys.has(candidate)) {
            counter += 1;
            candidate = `${baseKey}-v${counter}`;
        }
        return candidate;
    }

    static mergeBuilds(existingBuilds, newBuilds, newProductIds = new Set()) {
        const merged = { ...existingBuilds };
        const existingKeys = new Set(Object.keys(existingBuilds || {}));

        for (const [key, build] of Object.entries(newBuilds)) {
            const usesNew = this.buildUsesNewProduct(build, newProductIds);

            if (existingKeys.has(key) && !usesNew) {
                continue; // keep old build, skip replacing
            }

            const finalKey = existingKeys.has(key) ? this.makeUniqueKey(key, existingKeys) : key;
            merged[finalKey] = build;
            existingKeys.add(finalKey);
        }

        return merged;
    }

    /**
     * Save builds to file
     */
    static async saveBuildsToFile(builds) {
        const outputPath = path.join(__dirname, '../../ai/utils/referenceBuilds.js');
        
        // Ensure directory exists
        const outputDir = path.dirname(outputPath);
        try {
            await fs.mkdir(outputDir, { recursive: true });
            logger.info(`📁 Directory verified: ${outputDir}`);
        } catch (dirError) {
            logger.error('❌ Failed to create directory', { error: dirError.message, path: outputDir });
            throw new Error(`Cannot create output directory: ${dirError.message}`);
        }
        
        const fileContent = `/**
 * PC UPGRADE REFERENCE BUILDS SYSTEM
 * 
 * AUTO-GENERATED FROM DATABASE: ${new Date().toISOString()}
 * 
 * This module contains ${Object.keys(builds).length} reference builds using ACTUAL products.
 * Each build references real product IDs, ensuring accurate suggestions.
 */

const REFERENCE_BUILDS = ${JSON.stringify(builds, null, 2)};

module.exports = REFERENCE_BUILDS;
`;

        try {
            await fs.writeFile(outputPath, fileContent, 'utf-8');
            logger.info(`💾 Saved ${Object.keys(builds).length} builds to: ${outputPath}`);
        } catch (writeError) {
            logger.error('❌ Failed to write builds file', {
                error: writeError.message,
                path: outputPath,
                code: writeError.code
            });
            throw new Error(`Cannot write builds file: ${writeError.message}`);
        }
    }

    /**
     * Get product distribution statistics
     */
    static getProductDistribution() {
        const sortedUsage = Object.entries(productUsageCount).sort((a, b) => b[1] - a[1]);
        return {
            totalUniqueProducts: sortedUsage.length,
            mostUsed: sortedUsage.slice(0, 5).map(([id, count]) => ({ productId: id, usageCount: count })),
            leastUsed: sortedUsage.slice(-5).map(([id, count]) => ({ productId: id, usageCount: count }))
        };
    }
}

module.exports = PCUpgradeBuildGenerator;
