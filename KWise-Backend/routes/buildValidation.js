/**
 * PC Build Validation Route
 * Validates complete PC builds before checkout with 3-tier warnings and performance estimates
 * 
 * @module BuildValidationRoutes
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { kioskGeneralLimit } = require('../middleware/kioskRateLimit');
const { compatibilityService } = require('../services/compatibilityService');
const logger = require('../utils/logger');

/**
 * POST /api/build/validate
 * Comprehensive build validation with 3-tier warnings
 * Returns:
 * - ✅ GREEN: Fully compatible, no issues
 * - ⚠️ YELLOW: Compatible but not optimal (warnings)
 * - ❌ RED: Incompatible, cannot proceed (critical errors)
 */
router.post('/validate', kioskGeneralLimit, async (req, res) => {
    try {
        const { build } = req.body;

        if (!build || Object.keys(build).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Build data is required'
            });
        }

        logger.info('🔍 Validating PC build:', Object.keys(build));

        const deterministicResult = await compatibilityService.analyzeFullBuild(build);
        return res.json({
            success: true,
            source: 'deterministic',
            data: deterministicResult,
            compatible: deterministicResult.compatible,
            score: deterministicResult.score,
            verdict: deterministicResult.verdict,
            problems: deterministicResult.problems,
            warnings: deterministicResult.warnings,
            notes: deterministicResult.notes,
            manualChecks: deterministicResult.manualChecks,
            rulesApplied: deterministicResult.rulesApplied,
            latencyMs: deterministicResult.latencyMs,
            cache: deterministicResult.cache,
            message: `Build validation complete - ${deterministicResult.overall_status}`
        });

        const validation = {
            overall_status: 'compatible', // 'compatible', 'warning', 'incompatible'
            compatibility_score: 100,
            issues: [],
            warnings: [],
            recommendations: [],
            performance_estimate: {},
            power_analysis: {},
            bottleneck_analysis: {}
        };

        // Required categories for a complete build
        const requiredCategories = ['CPU', 'Motherboard', 'RAM', 'Storage', 'PSU', 'Case'];
        const optionalCategories = ['GPU', 'Cooling']; // GPU is optional for APUs

        // Check for missing required components
        for (const category of requiredCategories) {
            if (!build[category] && !build[category.toLowerCase()]) {
                validation.issues.push({
                    severity: 'critical',
                    category: category,
                    message: `Missing required component: ${category}`,
                    details: `A ${category} is required for a complete PC build`
                });
                validation.overall_status = 'incompatible';
                validation.compatibility_score -= 20;
            }
        }

        // If missing critical components, return early
        if (validation.overall_status === 'incompatible') {
            return res.json({
                success: true,
                data: validation,
                message: 'Build validation complete - critical issues found'
            });
        }

        // Normalize build components for analysis
        const normalizedBuild = {};
        for (const [key, component] of Object.entries(build)) {
            if (component && component.id) {
                const category = key.toUpperCase();
                normalizedBuild[category] = {
                    id: component.id,
                    name: component.name,
                    category: category,
                    price: component.price || 0,
                    specifications: component.specifications || {}
                };
            }
        }

        // 1. CPU + Motherboard Compatibility Check
        if (normalizedBuild.CPU && normalizedBuild.Motherboard) {
            const cpuSpecs = normalizedBuild.CPU.specifications || {};
            const mbSpecs = normalizedBuild.Motherboard.specifications || {};

            const cpuSocket = cpuSpecs.socket || cpuSpecs.Socket || '';
            const mbSocket = mbSpecs.socket || mbSpecs.Socket || mbSpecs.cpu_socket || '';

            if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
                validation.issues.push({
                    severity: 'critical',
                    category: 'CPU-Motherboard',
                    message: 'Socket mismatch',
                    details: `CPU socket (${cpuSocket}) is incompatible with Motherboard socket (${mbSocket})`
                });
                validation.overall_status = 'incompatible';
                validation.compatibility_score -= 30;
            }
        }

        // 2. RAM Compatibility Check
        if (normalizedBuild.RAM && normalizedBuild.Motherboard) {
            const ramSpecs = normalizedBuild.RAM.specifications || {};
            const mbSpecs = normalizedBuild.Motherboard.specifications || {};

            const ramType = ramSpecs.type || ramSpecs.Type || '';
            const mbRamType = mbSpecs.memory_type || mbSpecs.ram_type || '';

            if (ramType && mbRamType && !mbRamType.includes(ramType)) {
                validation.issues.push({
                    severity: 'critical',
                    category: 'RAM-Motherboard',
                    message: 'RAM type mismatch',
                    details: `RAM type (${ramType}) is incompatible with Motherboard (${mbRamType})`
                });
                validation.overall_status = 'incompatible';
                validation.compatibility_score -= 25;
            }

            // Check RAM speed warning
            const ramSpeed = Number.parseInt(ramSpecs.speed || ramSpecs.Speed || '0', 10);
            const mbMaxSpeed = Number.parseInt(mbSpecs.max_memory_speed || '0', 10);
            
            if (ramSpeed > mbMaxSpeed && mbMaxSpeed > 0) {
                validation.warnings.push({
                    severity: 'warning',
                    category: 'RAM',
                    message: 'RAM speed exceeds motherboard maximum',
                    details: `RAM speed (${ramSpeed}MHz) will be limited to motherboard maximum (${mbMaxSpeed}MHz)`
                });
                if (validation.overall_status === 'compatible') {
                    validation.overall_status = 'warning';
                }
                validation.compatibility_score -= 5;
            }
        }

        // 3. Power Supply Analysis
        if (normalizedBuild.PSU) {
            const psuSpecs = normalizedBuild.PSU.specifications || {};
            const psuWattage = Number.parseInt(psuSpecs.wattage || psuSpecs.Wattage || '0', 10);

            // Estimate power consumption
            let estimatedPower = 0;
            let powerBreakdown = {};

            // CPU power
            if (normalizedBuild.CPU) {
                const cpuTDP = Number.parseInt(normalizedBuild.CPU.specifications?.tdp || '65', 10);
                estimatedPower += cpuTDP;
                powerBreakdown.CPU = cpuTDP + 'W';
            }

            // GPU power
            if (normalizedBuild.GPU) {
                const gpuPower = Number.parseInt(normalizedBuild.GPU.specifications?.tdp || '150', 10);
                estimatedPower += gpuPower;
                powerBreakdown.GPU = gpuPower + 'W';
            }

            // Motherboard, RAM, Storage, Cooling (estimate 100W total)
            estimatedPower += 100;
            powerBreakdown.Other = '100W (MB, RAM, Storage, Cooling)';

            // Add 20% headroom
            const recommendedPSU = Math.ceil(estimatedPower * 1.2);
            powerBreakdown.Total = estimatedPower + 'W';
            powerBreakdown.Recommended = recommendedPSU + 'W';

            validation.power_analysis = {
                psu_wattage: psuWattage + 'W',
                estimated_consumption: estimatedPower + 'W',
                recommended_minimum: recommendedPSU + 'W',
                headroom: psuWattage > 0 ? ((psuWattage - estimatedPower) / psuWattage * 100).toFixed(1) + '%' : '0%',
                breakdown: powerBreakdown
            };

            if (psuWattage > 0 && psuWattage < recommendedPSU) {
                validation.warnings.push({
                    severity: 'warning',
                    category: 'PSU',
                    message: 'Insufficient power supply',
                    details: `${psuWattage}W PSU may be insufficient. Recommended: ${recommendedPSU}W or higher`
                });
                if (validation.overall_status === 'compatible') {
                    validation.overall_status = 'warning';
                }
                validation.compatibility_score -= 10;
            }

            if (psuWattage > 0 && psuWattage < estimatedPower) {
                validation.issues.push({
                    severity: 'critical',
                    category: 'PSU',
                    message: 'Power supply too weak',
                    details: `${psuWattage}W PSU cannot power this build (requires ${estimatedPower}W minimum)`
                });
                validation.overall_status = 'incompatible';
                validation.compatibility_score -= 20;
            }
        }

        // 4. Bottleneck Analysis
        if (normalizedBuild.CPU && normalizedBuild.GPU) {
            const cpuName = normalizedBuild.CPU.name.toLowerCase();
            const gpuName = normalizedBuild.GPU.name.toLowerCase();

            // Simple tier detection
            const cpuTier = detectTier(cpuName);
            const gpuTier = detectTier(gpuName);

            if (Math.abs(cpuTier - gpuTier) >= 2) {
                const bottleneck = cpuTier < gpuTier ? 'CPU' : 'GPU';
                validation.warnings.push({
                    severity: 'warning',
                    category: 'Balance',
                    message: `Potential ${bottleneck} bottleneck detected`,
                    details: `${bottleneck} may limit overall performance. Consider upgrading for balanced build.`
                });
                if (validation.overall_status === 'compatible') {
                    validation.overall_status = 'warning';
                }
                validation.compatibility_score -= 8;

                validation.bottleneck_analysis = {
                    detected: true,
                    component: bottleneck,
                    cpu_tier: getTierName(cpuTier),
                    gpu_tier: getTierName(gpuTier),
                    recommendation: `Consider upgrading ${bottleneck} to match ${bottleneck === 'CPU' ? 'GPU' : 'CPU'} performance`
                };
            } else {
                validation.bottleneck_analysis = {
                    detected: false,
                    message: 'Build appears balanced, no major bottlenecks detected'
                };
            }
        }

        // 5. Performance Estimates (simplified)
        if (normalizedBuild.GPU) {
            const gpuName = normalizedBuild.GPU.name.toLowerCase();
            const gpuTier = detectTier(gpuName);

            validation.performance_estimate = {
                gaming_1080p: getPerformanceRating(gpuTier, 0),
                gaming_1440p: getPerformanceRating(gpuTier, -1),
                gaming_4k: getPerformanceRating(gpuTier, -2),
                productivity: getCPUPerformanceRating(normalizedBuild.CPU?.name || ''),
                note: 'Estimates based on component specifications. Actual performance may vary.'
            };
        } else {
            // APU/Integrated graphics
            validation.performance_estimate = {
                gaming_1080p: '★★☆☆☆ 30-60 FPS (Low-Medium)',
                gaming_1440p: '★☆☆☆☆ Not recommended',
                gaming_4K: '☆☆☆☆☆ Not supported',
                productivity: getCPUPerformanceRating(normalizedBuild.CPU?.name || ''),
                note: 'Integrated graphics detected. Dedicated GPU recommended for gaming.'
            };
        }

        // 6. Generate recommendations
        if (validation.warnings.length > 0 || validation.issues.length > 0) {
            validation.recommendations.push({
                priority: 'high',
                message: 'Review compatibility issues',
                details: 'Address all critical issues before proceeding with purchase'
            });
        }

        if (validation.overall_status === 'warning' && validation.compatibility_score >= 85) {
            validation.recommendations.push({
                priority: 'medium',
                message: 'Build is usable with minor concerns',
                details: 'Warnings indicate suboptimal configuration but build will function'
            });
        }

        if (validation.compatibility_score === 100) {
            validation.recommendations.push({
                priority: 'low',
                message: 'Excellent build compatibility!',
                details: 'All components are compatible with no issues detected'
            });
        }

        logger.info(`✅ Build validation complete: ${validation.overall_status} (Score: ${validation.compatibility_score})`);

        res.json({
            success: true,
            data: validation,
            message: `Build validation complete - ${validation.overall_status}`
        });

    } catch (error) {
        logger.error('❌ Build validation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during build validation',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Helper: Detect component tier (1=entry, 2=mid, 3=high, 4=elite)
 */
function detectTier(name) {
    const nameLower = name.toLowerCase();
    
    // Elite tier
    if (nameLower.match(/rtx 409|rtx 408|rtx 309|ryzen 9|core i9|threadripper/)) {
        return 4;
    }
    
    // High tier
    if (nameLower.match(/rtx 407|rtx 308|rtx 3070|ryzen 7|core i7/)) {
        return 3;
    }
    
    // Mid tier
    if (nameLower.match(/rtx 406|rtx 307|rtx 3060|gtx 1660|ryzen 5|core i5/)) {
        return 2;
    }
    
    // Entry tier
    return 1;
}

/**
 * Helper: Get tier name
 */
function getTierName(tier) {
    const names = { 1: 'Entry', 2: 'Mid-Range', 3: 'High-End', 4: 'Elite' };
    return names[tier] || 'Unknown';
}

/**
 * Helper: Get performance rating
 */
function getPerformanceRating(tier, adjustment) {
    const adjustedTier = Math.max(1, Math.min(4, tier + adjustment));
    const ratings = {
        1: '★☆☆☆☆ 30-45 FPS (Low)',
        2: '★★☆☆☆ 45-60 FPS (Medium)',
        3: '★★★★☆ 60-120 FPS (High)',
        4: '★★★★★ 120+ FPS (Ultra)'
    };
    return ratings[adjustedTier] || 'Unknown';
}

/**
 * Helper: Get CPU performance rating
 */
function getCPUPerformanceRating(name) {
    const nameLower = name.toLowerCase();
    
    if (nameLower.match(/ryzen 9|core i9|threadripper/)) {
        return '★★★★★ Excellent';
    }
    if (nameLower.match(/ryzen 7|core i7/)) {
        return '★★★★☆ Very Good';
    }
    if (nameLower.match(/ryzen 5|core i5/)) {
        return '★★★☆☆ Good';
    }
    return '★★☆☆☆ Fair';
}

module.exports = router;
