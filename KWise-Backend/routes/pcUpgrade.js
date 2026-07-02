/**
 * PC UPGRADE ROUTES
 * 
 * RESTful API routes for PC upgrade analysis and recommendations
 * Provides endpoints for upgrade path analysis, external suggestions, and reference builds
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const upgradeService = require('../services/upgradeService');
const { query } = require('../config/db');
const { kioskGeneralLimit } = require('../middleware/kioskRateLimit');

// ============================================================
// UPGRADE ANALYSIS ROUTES
// ============================================================

/**
 * GET /api/pc-upgrade/parameters
 * Get available parameters for PC upgrade analysis
 */
router.get('/parameters', kioskGeneralLimit, async (req, res) => {
    try {
        logger.info('📋 Fetching PC Upgrade Parameters');
        
        // Get available usage types and age ranges from reference builds
        const paramsResult = await query(`
            SELECT 
                DISTINCT usage_type,
                ARRAY_AGG(DISTINCT age_range ORDER BY age_range) as age_ranges,
                ARRAY_AGG(DISTINCT budget_range ORDER BY budget_range) as budget_ranges
            FROM pc_upgrade_reference_builds
            WHERE is_active = true
            GROUP BY usage_type
            ORDER BY usage_type
        `);
        
        // Get component categories available for upgrade
        const categoriesResult = await query(`
            SELECT DISTINCT category
            FROM pc_parts
            WHERE is_active = true AND stock > 0
            ORDER BY category
        `);
        
        // Get price ranges by category
        const priceRangesResult = await query(`
            SELECT 
                category,
                MIN(CAST(price AS NUMERIC)) as min_price,
                MAX(CAST(price AS NUMERIC)) as max_price,
                AVG(CAST(price AS NUMERIC)) as avg_price
            FROM pc_parts
            WHERE is_active = true AND stock > 0
            GROUP BY category
            ORDER BY category
        `);
        
        const parameters = {
            usageTypes: paramsResult.rows.map(r => r.usage_type),
            ageRanges: paramsResult.rows.length > 0 ? paramsResult.rows[0].age_ranges : [],
            budgetRanges: paramsResult.rows.length > 0 ? paramsResult.rows[0].budget_ranges : [],
            categories: categoriesResult.rows.map(r => r.category),
            priceRanges: priceRangesResult.rows.reduce((acc, row) => {
                acc[row.category] = {
                    min: Number.parseFloat(row.min_price),
                    max: Number.parseFloat(row.max_price),
                    avg: Number.parseFloat(row.avg_price)
                };
                return acc;
            }, {}),
            defaultValues: {
                usageType: 'Gaming',
                ageRange: '2016-2020',
                budgetRange: '26000-50000',
                budget: 30000
            }
        };
        
        res.json({
            success: true,
            data: parameters,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error fetching PC upgrade parameters:', error);
        
        // Return fallback parameters if database query fails
        res.json({
            success: true,
            data: {
                usageTypes: ['Gaming', 'Office', 'Creative', 'Mixed'],
                ageRanges: ['2010-2015', '2016-2020', '2021-2024'],
                budgetRanges: ['10000-25999', '26000-50000', '50001-100000', '100000+'],
                categories: ['CPU', 'GPU', 'RAM', 'Storage', 'Motherboard', 'PSU', 'Case', 'Cooling'],
                priceRanges: {},
                defaultValues: {
                    usageType: 'Gaming',
                    ageRange: '2016-2020',
                    budgetRange: '26000-50000',
                    budget: 30000
                },
                fallback: true
            },
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * POST /api/pc-upgrade/analyze
 * Analyze current PC and generate upgrade recommendations
 * 
 * Body: {
 *   currentBuild: { CPU: {...}, GPU: {...}, ... },
 *   budget: number,
 *   usageType: string,
 *   yearRange: string
 * }
 */
router.post('/analyze', kioskGeneralLimit, async (req, res) => {
    try {
        logger.info('📊 PC Upgrade Analysis Request');
        
        const { currentBuild, budget, usageType, yearRange } = req.body;
        
        if (!currentBuild || !budget) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: currentBuild, budget'
            });
        }
        
        // Get matching reference builds
        const referenceBuildsResult = await query(`
            SELECT * FROM pc_upgrade_reference_builds
            WHERE usage_type = $1
            AND age_range = $2
            AND total_price <= $3
            ORDER BY total_price DESC
            LIMIT 5
        `, [usageType || 'Gaming', yearRange || '2016-2020', budget]);
        
        // Generate dual upgrades for each component
        const upgrades = {};
        const components = currentBuild;
        
        for (const [category, component] of Object.entries(components)) {
            if (component && component.name) {
                const upgrade = await upgradeService.generateDualUpgrades(component, category);
                upgrades[category] = upgrade;
            }
        }
        
        res.json({
            success: true,
            currentBuild: components,
            upgrades,
            referenceBuilds: referenceBuildsResult.rows,
            recommendedBudget: budget,
            message: 'Upgrade analysis completed successfully'
        });
        
    } catch (error) {
        logger.error('Error analyzing PC upgrade:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze PC upgrade',
            error: error.message
        });
    }
});

/**
 * POST /api/pc-upgrade/external-suggestions
 * Get external market upgrade suggestions for a specific component
 * 
 * Body: {
 *   currentComponent: string (name),
 *   category: string (CPU, GPU, RAM, etc.),
 *   budget: number,
 *   targetPerformance: string
 * }
 */
router.post('/external-suggestions', kioskGeneralLimit, async (req, res) => {
    try {
        logger.info('🌐 External Upgrade Suggestions Request');
        
        const { currentComponent, category, budget, targetPerformance } = req.body;
        
        if (!currentComponent || !category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: currentComponent, category'
            });
        }

        return res.status(410).json({
            success: false,
            code: 'OFFLINE_ONLY',
            source: 'deterministic',
            aiEnabled: false,
            currentComponent,
            category,
            suggestions: [],
            budget: budget || 0,
            targetPerformance: targetPerformance || 'balanced',
            message: 'External upgrade suggestions are disabled in local offline kiosk mode'
        });
        
        // Mock component object for upgrade service
        const componentObj = {
            name: currentComponent,
            category: category,
            price: budget ? budget.toString() : '0'
        };
        
        // Generate two external suggestions
        const suggestion1 = await upgradeService.getExternalUpgrade(componentObj, category, 1);
        const suggestion2 = await upgradeService.getExternalUpgrade(componentObj, category, 2);
        
        res.json({
            success: true,
            currentComponent,
            category,
            suggestions: [suggestion1, suggestion2],
            budget: budget || 0,
            targetPerformance: targetPerformance || 'balanced',
            message: 'External suggestions generated successfully'
        });
        
    } catch (error) {
        logger.error('Error generating external suggestions:', error);
        
        // Provide graceful fallback
        const fallbackSuggestions = getFallbackSuggestions(req.body.category, req.body.budget);
        
        res.json({
            success: true,
            currentComponent: req.body.currentComponent || 'Unknown',
            category: req.body.category || 'Unknown',
            suggestions: fallbackSuggestions,
            budget: req.body.budget || 0,
            fallback: true,
            message: 'Using fallback suggestions (AI temporarily unavailable)',
            error: error.message
        });
    }
});

/**
 * GET /api/pc-upgrade/available-upgrades
 * Get available in-stock upgrade options for a category
 * 
 * Query: ?category=GPU&minPrice=10000&maxPrice=50000
 */
router.get('/available-upgrades', kioskGeneralLimit, async (req, res) => {
    try {
        const { category, minPrice, maxPrice } = req.query;
        
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: category'
            });
        }
        
        let whereClause = 'WHERE category = $1 AND stock > 0 AND is_active = true';
        const params = [category];
        
        if (minPrice) {
            whereClause += ` AND CAST(price AS NUMERIC) >= $${params.length + 1}`;
            params.push(minPrice);
        }
        
        if (maxPrice) {
            whereClause += ` AND CAST(price AS NUMERIC) <= $${params.length + 1}`;
            params.push(maxPrice);
        }
        
        const result = await query(`
            SELECT id, name, brand, category, price, stock, specifications
            FROM pc_parts
            ${whereClause}
            ORDER BY CAST(price AS NUMERIC) DESC
            LIMIT 10
        `, params);
        
        res.json({
            success: true,
            category,
            upgrades: result.rows,
            count: result.rows.length,
            priceRange: {
                min: minPrice || 0,
                max: maxPrice || 999999
            }
        });
        
    } catch (error) {
        logger.error('Error fetching available upgrades:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available upgrades',
            error: error.message
        });
    }
});

/**
 * GET /api/pc-upgrade/reference-builds
 * Get reference builds for upgrade recommendations
 * 
 * Query: ?usageType=Gaming&ageRange=2016-2020&budgetRange=26000-50000
 */
router.get('/reference-builds', kioskGeneralLimit, async (req, res) => {
    try {
        const { usageType, ageRange, budgetRange } = req.query;
        
        let whereClause = 'WHERE is_active = true';
        const params = [];
        
        if (usageType) {
            whereClause += ` AND usage_type = $${params.length + 1}`;
            params.push(usageType);
        }
        
        if (ageRange) {
            whereClause += ` AND age_range = $${params.length + 1}`;
            params.push(ageRange);
        }
        
        if (budgetRange) {
            whereClause += ` AND budget_range = $${params.length + 1}`;
            params.push(budgetRange);
        }
        
        const result = await query(`
            SELECT id, usage_type, age_range, budget_range, components, total_price, 
                   performance_score, generation_metadata
            FROM pc_upgrade_reference_builds
            ${whereClause}
            ORDER BY total_price ASC
            LIMIT 20
        `, params);
        
        res.json({
            success: true,
            builds: result.rows,
            count: result.rows.length,
            filters: {
                usageType: usageType || 'All',
                ageRange: ageRange || 'All',
                budgetRange: budgetRange || 'All'
            }
        });
        
    } catch (error) {
        logger.error('Error fetching reference builds:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reference builds',
            error: error.message
        });
    }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Fallback suggestions when AI is unavailable
 */
function getFallbackSuggestions(category, budget) {
    const baseBudget = budget || 20000;
    
    const fallbacks = {
        'CPU': [
            {
                name: 'AMD Ryzen 7 7800X3D',
                estimatedPrice: baseBudget * 1.3,
                priceDifference: baseBudget * 0.3,
                priceDifferenceFormatted: `PHP +${(baseBudget * 0.3).toLocaleString()}`,
                recommendedYear: new Date().getFullYear() + 1,
                performanceGain: '+40%',
                reason: 'High-performance gaming CPU with 3D V-Cache technology',
                available: false,
                source: 'fallback',
                confidence: 75,
                badge: '📍 Reference Only',
                isReferenceOnly: true
            },
            {
                name: 'AMD Ryzen 9 7950X3D',
                estimatedPrice: baseBudget * 1.5,
                priceDifference: baseBudget * 0.5,
                priceDifferenceFormatted: `PHP +${(baseBudget * 0.5).toLocaleString()}`,
                recommendedYear: new Date().getFullYear() + 1,
                performanceGain: '+55%',
                reason: 'Flagship CPU with exceptional multi-core performance',
                available: false,
                source: 'fallback',
                confidence: 70,
                badge: '📍 Reference Only',
                isReferenceOnly: true
            }
        ],
        'GPU': [
            {
                name: 'NVIDIA RTX 4070 Ti',
                estimatedPrice: baseBudget * 1.35,
                priceDifference: baseBudget * 0.35,
                priceDifferenceFormatted: `PHP +${(baseBudget * 0.35).toLocaleString()}`,
                recommendedYear: new Date().getFullYear() + 1,
                performanceGain: '+50%',
                reason: 'High-end GPU with DLSS 3.0 and ray tracing',
                available: false,
                source: 'fallback',
                confidence: 80,
                badge: '📍 Reference Only',
                isReferenceOnly: true
            },
            {
                name: 'AMD RX 7900 XTX',
                estimatedPrice: baseBudget * 1.4,
                priceDifference: baseBudget * 0.4,
                priceDifferenceFormatted: `PHP +${(baseBudget * 0.4).toLocaleString()}`,
                recommendedYear: new Date().getFullYear() + 1,
                performanceGain: '+55%',
                reason: 'Top-tier AMD GPU with excellent 4K performance',
                available: false,
                source: 'fallback',
                confidence: 75,
                badge: '📍 Reference Only',
                isReferenceOnly: true
            }
        ]
    };
    
    return fallbacks[category] || [
        {
            name: `Next-Gen ${category}`,
            estimatedPrice: baseBudget * 1.3,
            priceDifference: baseBudget * 0.3,
            priceDifferenceFormatted: `PHP +${(baseBudget * 0.3).toLocaleString()}`,
            recommendedYear: new Date().getFullYear() + 1,
            performanceGain: '+35%',
            reason: 'Next-generation technology upgrade',
            available: false,
            source: 'fallback',
            confidence: 70,
            badge: '📍 Reference Only',
            isReferenceOnly: true
        }
    ];
}

module.exports = router;
