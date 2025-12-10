/**
 * Automated Reference Build Generator
 * Runs monthly to update PC build recommendations with latest in-stock components
 * Implements tier-based matching and stock-aware filtering
 * 
 * ROOT CAUSE FIX: Reference builds were becoming stale and suggesting out-of-stock items
 * This script automates monthly updates with intelligent component selection
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Usage types for build configurations
 */
const USAGE_TYPES = ['gaming', 'office', 'content-creation'];

/**
 * Budget ranges with tier classifications
 */
const BUDGET_RANGES = [
    { min: 10000, max: 25000, tier: 'entry', label: 'Budget' },
    { min: 26000, max: 50000, tier: 'mid-tier', label: 'Mid-Range' },
    { min: 51000, max: 75000, tier: 'high-tier', label: 'High-End' },
    { min: 76000, max: 100000, tier: 'elite', label: 'Elite' }
];

/**
 * Component budget allocation by usage type (as percentage of total)
 */
const COMPONENT_BUDGETS = {
    gaming: {
        CPU: 0.30,
        GPU: 0.45,
        RAM: 0.10,
        Storage: 0.08,
        Motherboard: 0.12,
        PSU: 0.08,
        Case: 0.04,
        'CPU Cooler': 0.03
    },
    office: {
        CPU: 0.35,
        GPU: 0.15,
        RAM: 0.15,
        Storage: 0.15,
        Motherboard: 0.12,
        PSU: 0.08,
        Case: 0.05,
        'CPU Cooler': 0.03
    },
    'content-creation': {
        CPU: 0.35,
        GPU: 0.30,
        RAM: 0.15,
        Storage: 0.12,
        Motherboard: 0.12,
        PSU: 0.08,
        Case: 0.04,
        'CPU Cooler': 0.04
    }
};

/**
 * Main function to generate all reference builds
 */
async function generateReferenceBuilds() {
    try {
        logger.info('🤖 Starting automated reference build generation...');
        const startTime = Date.now();

        let totalBuilds = 0;
        let successBuilds = 0;
        let failedBuilds = 0;

        for (const usage of USAGE_TYPES) {
            for (const budgetRange of BUDGET_RANGES) {
                try {
                    const build = await generateBuildForConfig(usage, budgetRange);
                    
                    if (build && build.components && Object.keys(build.components).length >= 6) {
                        await saveBuildToDatabase(build);
                        logger.info(`✅ Generated ${usage} ${budgetRange.label} build (₱${build.totalBudget.toLocaleString()})`);
                        successBuilds++;
                    } else {
                        logger.warn(`⚠️  Incomplete build for ${usage} ${budgetRange.label}`);
                        failedBuilds++;
                    }
                    totalBuilds++;
                } catch (error) {
                    logger.error(`❌ Failed to generate ${usage} ${budgetRange.label} build:`, error.message);
                    failedBuilds++;
                    totalBuilds++;
                }
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`🎉 Reference build generation complete!`);
        logger.info(`📊 Stats: ${successBuilds}/${totalBuilds} successful, ${failedBuilds} failed, ${duration}s`);

        return {
            success: true,
            total: totalBuilds,
            successful: successBuilds,
            failed: failedBuilds,
            duration
        };

    } catch (error) {
        logger.error('❌ Reference build generation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Generate build for specific configuration
 * ROOT CAUSE FIX: Stock-aware component selection
 */
async function generateBuildForConfig(usage, budgetRange) {
    try {
        logger.info(`🔨 Building ${usage} ${budgetRange.label} (₱${budgetRange.min}-₱${budgetRange.max})...`);

        // Step 1: Get available components IN STOCK ONLY (ROOT CAUSE FIX)
        const componentBudgets = COMPONENT_BUDGETS[usage];
        const build = {
            usage,
            budgetTier: budgetRange.tier,
            budgetLabel: budgetRange.label,
            budgetRange: `₱${budgetRange.min.toLocaleString()}-₱${budgetRange.max.toLocaleString()}`,
            components: {},
            totalBudget: 0
        };

        // Step 2: Select components in order of importance
        const componentOrder = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case', 'CPU Cooler'];

        for (const category of componentOrder) {
            const componentBudget = budgetRange.max * componentBudgets[category];
            const component = await selectBestComponent(
                category, 
                componentBudget, 
                budgetRange.tier,
                usage,
                build.components
            );

            if (component) {
                build.components[category] = {
                    id: component.id,
                    name: component.name,
                    price: component.price,
                    tier: component.tier,
                    brand: component.brand,
                    stock: component.stock
                };
                build.totalBudget += parseFloat(component.price);
                logger.debug(`  ✓ Selected ${category}: ${component.name} (₱${component.price})`);
            } else {
                logger.warn(`  ⚠️  No suitable ${category} found within budget ₱${componentBudget.toFixed(0)}`);
            }
        }

        // Validate build completeness
        if (Object.keys(build.components).length < 6) {
            throw new Error(`Incomplete build: only ${Object.keys(build.components).length} components`);
        }

        // Check if build is within budget (allow 10% overage)
        if (build.totalBudget > budgetRange.max * 1.1) {
            logger.warn(`  ⚠️  Build over budget: ₱${build.totalBudget} > ₱${budgetRange.max * 1.1}`);
        }

        return build;

    } catch (error) {
        logger.error(`Error generating build for ${usage} ${budgetRange.label}:`, error.message);
        throw error;
    }
}

/**
 * Select best component for category
 * ROOT CAUSE FIX: Tier-based matching + stock filtering + compatibility checks
 */
async function selectBestComponent(category, budget, targetTier, usage, existingComponents) {
    try {
        // Step 1: Query in-stock components within budget and tier
        const tierFilter = getTierCompatibilityFilter(targetTier);
        
        const result = await query(`
            SELECT 
                id, name, brand, price, stock, tier, specifications
            FROM pc_parts
            WHERE category = $1
              AND stock > 0
              AND is_active = true
              AND kiosk_visible = true
              AND price <= $2
              AND tier = ANY($3)
            ORDER BY 
                CASE 
                    WHEN tier = $4 THEN 1  -- Exact tier match first
                    ELSE 2
                END,
                price DESC
            LIMIT 20
        `, [category, budget * 1.15, tierFilter, targetTier]);

        if (result.rows.length === 0) {
            logger.debug(`  No ${category} found for tier ${targetTier} under ₱${budget.toFixed(0)}`);
            return null;
        }

        // Step 2: Score components by value and compatibility
        const scoredComponents = result.rows.map(component => {
            let score = 100;

            // Tier match scoring
            if (component.tier === targetTier) {
                score += 20;
            } else if (getTierLevel(component.tier) === getTierLevel(targetTier) - 1) {
                score += 10; // One tier below is okay
            }

            // Value scoring (performance per peso)
            const priceRatio = component.price / budget;
            if (priceRatio >= 0.8 && priceRatio <= 1.0) {
                score += 15; // Near budget is good
            } else if (priceRatio < 0.5) {
                score -= 10; // Too cheap might be underperforming
            }

            // Stock availability scoring
            if (component.stock >= 10) {
                score += 10;
            } else if (component.stock >= 5) {
                score += 5;
            }

            // Usage-specific scoring
            if (usage === 'gaming' && category === 'GPU' && component.price > budget * 0.9) {
                score += 10; // Max out GPU for gaming
            }

            if (usage === 'content-creation' && (category === 'CPU' || category === 'RAM') && component.price > budget * 0.85) {
                score += 10; // Prioritize CPU/RAM for content creation
            }

            // Compatibility checks
            const compatibility = checkBasicCompatibility(category, component, existingComponents);
            if (!compatibility.compatible) {
                score -= 50; // Heavy penalty for incompatibility
            }

            return {
                ...component,
                score,
                compatibility
            };
        });

        // Step 3: Return highest scored component
        scoredComponents.sort((a, b) => b.score - a.score);
        return scoredComponents[0];

    } catch (error) {
        logger.error(`Error selecting ${category}:`, error.message);
        return null;
    }
}

/**
 * Get compatible tiers for a target tier
 */
function getTierCompatibilityFilter(tier) {
    const compatibilityMatrix = {
        'entry': ['entry', 'mid-tier'],
        'mid-tier': ['entry', 'mid-tier', 'high-tier'],
        'high-tier': ['mid-tier', 'high-tier', 'elite'],
        'elite': ['high-tier', 'elite']
    };

    return compatibilityMatrix[tier] || ['entry', 'mid-tier', 'high-tier', 'elite'];
}

/**
 * Get tier level (for comparison)
 */
function getTierLevel(tier) {
    const levels = { 'entry': 1, 'mid-tier': 2, 'high-tier': 3, 'elite': 4 };
    return levels[tier] || 2;
}

/**
 * Basic compatibility checking
 */
function checkBasicCompatibility(category, component, existingComponents) {
    // If no existing components, everything is compatible
    if (Object.keys(existingComponents).length === 0) {
        return { compatible: true, reason: 'First component' };
    }

    // CPU socket compatibility with Motherboard
    if (category === 'CPU' && existingComponents.Motherboard) {
        // TODO: Add socket matching logic
        return { compatible: true, reason: 'CPU-Motherboard socket check needed' };
    }

    if (category === 'Motherboard' && existingComponents.CPU) {
        // TODO: Add socket matching logic
        return { compatible: true, reason: 'Motherboard-CPU socket check needed' };
    }

    // RAM type compatibility
    if (category === 'RAM' && (existingComponents.CPU || existingComponents.Motherboard)) {
        // TODO: Add DDR4/DDR5 checking
        return { compatible: true, reason: 'RAM type check needed' };
    }

    // PSU wattage sufficiency
    if (category === 'PSU') {
        // TODO: Calculate total system power draw
        return { compatible: true, reason: 'PSU wattage check needed' };
    }

    // Default: assume compatible
    return { compatible: true, reason: 'General compatibility' };
}

/**
 * Save build to database
 */
async function saveBuildToDatabase(build) {
    try {
        await query(`
            INSERT INTO pc_customized_ai_builds 
            (usage, budget_tier, budget_label, budget_range, components, total_budget, generated_date, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (usage, budget_tier) 
            DO UPDATE SET 
                components = $5,
                total_budget = $6,
                budget_range = $4,
                budget_label = $3,
                updated_at = NOW(),
                generated_date = NOW()
        `, [
            build.usage,
            build.budgetTier,
            build.budgetLabel,
            build.budgetRange,
            JSON.stringify(build.components),
            build.totalBudget
        ]);

        logger.debug(`✓ Saved build to database: ${build.usage} ${build.budgetLabel}`);
    } catch (error) {
        logger.error('Error saving build to database:', error.message);
        throw error;
    }
}

/**
 * CLI execution
 */
if (require.main === module) {
    generateReferenceBuilds()
        .then(result => {
            console.log('\n📊 Final Result:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { generateReferenceBuilds };
