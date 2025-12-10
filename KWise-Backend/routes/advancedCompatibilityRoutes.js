/**
 * Advanced Compatibility API Routes
 * Provides endpoints for advanced compatibility analysis:
 * - Power budget calculator
 * - Physical clearance validation
 * - Pairwise component checking
 * - Bottleneck detection
 * - Full build comprehensive analysis
 */

const express = require('express');
const router = express.Router();
const advancedCompatibilityService = require('../services/advancedCompatibilityService');
const logger = require('../utils/logger');

/**
 * POST /api/compatibility/advanced/power
 * Analyze power budget for build
 */
router.post('/power', async (req, res) => {
    try {
        const { components } = req.body;

        if (!components) {
            return res.status(400).json({
                success: false,
                error: 'Components object required'
            });
        }

        const result = await advancedCompatibilityService.analyzePowerBudget(components);

        // Service already returns correct structure, just add convenience mapping
        res.json({
            success: true,
            data: {
                ...result,
                // Add convenience mappings for easier access
                totalPower: result.analysis?.total_power,
                psuAnalysis: {
                    ...result.analysis,
                    adequate: result.compatible,
                    status: result.status
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Power budget analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Power budget analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/compatibility/advanced/clearance
 * Check physical clearances for components
 */
router.post('/clearance', async (req, res) => {
    try {
        const { components } = req.body;

        if (!components) {
            return res.status(400).json({
                success: false,
                error: 'Components object required'
            });
        }

        const result = await advancedCompatibilityService.analyzePhysicalClearances(components);

        // Service already returns correct structure, just send it
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Physical clearance analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Physical clearance analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/compatibility/advanced/pairwise
 * Check all component pairs for compatibility
 */
router.post('/pairwise', async (req, res) => {
    try {
        const { components } = req.body;

        if (!components) {
            return res.status(400).json({
                success: false,
                error: 'Components object required'
            });
        }

        const result = await advancedCompatibilityService.analyzePairwiseCompatibility(components);

        // Service already returns correct structure, just add convenience mapping
        res.json({
            success: true,
            data: {
                ...result,
                // Add convenience mappings
                overall_compatible: result.compatible,
                overall_status: result.status
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Pairwise analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Pairwise analysis failed',
            message: error.message
        });
    }
});

/**
 * POST /api/compatibility/advanced/bottleneck
 * Detect performance bottlenecks in build
 */
router.post('/bottleneck', async (req, res) => {
    try {
        const { components } = req.body;

        if (!components) {
            return res.status(400).json({
                success: false,
                error: 'Components object required'
            });
        }

        const result = await advancedCompatibilityService.analyzeBottlenecks(components);

        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Bottleneck detection failed:', error);
        res.status(500).json({
            success: false,
            error: 'Bottleneck detection failed',
            message: error.message
        });
    }
});

/**
 * POST /api/compatibility/advanced/full
 * Comprehensive build analysis (all 4 layers)
 */
router.post('/full', async (req, res) => {
    try {
        const { components } = req.body;

        if (!components) {
            return res.status(400).json({
                success: false,
                error: 'Components object required'
            });
        }

        logger.info('🔍 [API] Starting comprehensive build analysis...');

        const result = await advancedCompatibilityService.analyzeFullBuild(components);

        // Calculate compatibility score
        let score = 100;
        const criticalIssues = result.summary?.total_critical_issues || 0;
        const warnings = result.summary?.total_warnings || 0;
        score -= (criticalIssues * 20); // -20 points per critical issue
        score -= (warnings * 5); // -5 points per warning
        score = Math.max(0, Math.min(100, score));

        logger.info(`🔍 [API] Analysis complete: ${result.overall_status}, Score: ${score}/100`);

        // Service already returns correct structure, just add compatibility score
        res.json({
            success: true,
            data: {
                ...result,
                compatibility_score: score,
                // Convenience mappings
                power: result.layers?.power,
                clearance: result.layers?.clearance,
                pairwise: result.layers?.pairwise,
                bottleneck: result.layers?.bottleneck
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Full build analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Full build analysis failed',
            message: error.message
        });
    }
});

/**
 * GET /api/compatibility/advanced/test
 * Test endpoint with sample build
 */
router.get('/test', async (req, res) => {
    try {
        const sampleBuild = {
            cpu: {
                id: 1,
                name: 'Intel Core i5-12400F',
                category: 'CPU',
                specifications: {
                    socket: 'LGA1700',
                    tdp: 65,
                    performance_tier: 'mid-tier',
                    max_memory_speed: 3200
                }
            },
            motherboard: {
                id: 2,
                name: 'ASUS Prime B660M-A',
                category: 'Motherboard',
                specifications: {
                    socket: 'LGA1700',
                    chipset: 'B660',
                    form_factor: 'Micro-ATX'
                }
            },
            gpu: {
                id: 3,
                name: 'MSI RTX 3060 Ti GAMING X',
                category: 'GPU',
                specifications: {
                    tdp: 200,
                    length: 327,
                    slots: 2.5,
                    performance_tier: 'mid-tier'
                }
            },
            psu: {
                id: 4,
                name: 'Corsair RM650x 650W 80+ Gold',
                category: 'PSU',
                specifications: {
                    wattage: 650,
                    efficiency: '80+ Gold',
                    pcie_8pin: 2
                }
            },
            case: {
                id: 5,
                name: 'NZXT H510 Flow',
                category: 'Case',
                specifications: {
                    max_gpu_length: 381,
                    max_cooler_height: 165,
                    form_factor: 'ATX'
                }
            },
            cooler: {
                id: 6,
                name: 'be quiet! Dark Rock 4',
                category: 'Cooling',
                specifications: {
                    height: 159,
                    socket: 'LGA1700',
                    tdp: 200
                }
            },
            ram: {
                id: 7,
                name: 'Corsair Vengeance DDR4 16GB 3200MHz',
                category: 'RAM',
                specifications: {
                    type: 'DDR4',
                    speed: 3200,
                    height: 51
                }
            }
        };

        const result = await advancedCompatibilityService.analyzeFullBuild(sampleBuild);

        res.json({
            success: true,
            message: 'Test analysis complete',
            data: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('❌ [API] Test analysis failed:', error);
        res.status(500).json({
            success: false,
            error: 'Test analysis failed',
            message: error.message
        });
    }
});

module.exports = router;
