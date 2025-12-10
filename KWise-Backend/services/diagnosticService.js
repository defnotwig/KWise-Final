/**
 * ============================================================================
 * PC DIAGNOSTIC SERVICE - PHASE 2
 * ============================================================================
 * 
 * AI-powered PC troubleshooting and diagnostic analysis service.
 * Analyzes system information, user-reported issues, and diagnostic data
 * to identify root causes and provide remediation steps.
 * 
 * Features:
 * - Health score calculation (0-100)
 * - Multi-category analysis (hardware, thermal, power, software, config)
 * - Root cause identification with evidence
 * - Prioritized remediation steps
 * - Confidence-weighted recommendations
 * 
 * ============================================================================
 */

const logger = require('../utils/logger');
const enhancedAIService = require('./enhancedAIService');
const PromptTemplates = require('./promptTemplates');
const MetadataEnrichmentService = require('./metadataEnrichmentService');

/**
 * ============================================================================
 * Main Diagnostic Analysis Function
 * ============================================================================
 */
async function analyzeDiagnostic(systemInfo, userReport, diagnosticData = {}) {
    try {
        logger.info(`🔧 Starting diagnostic analysis for system: ${systemInfo.name || 'Unknown'}`);

        // Step 1: Enrich system component metadata
        const enrichedSystem = await MetadataEnrichmentService.enrichPartsMetadata(
            systemInfo.components || systemInfo,
            { includeKnownIssues: true, includeThermalData: true }
        );

        // Step 2: Collect diagnostic metrics
        const metrics = collectDiagnosticMetrics(systemInfo, diagnosticData);

        // Step 3: Calculate preliminary health score
        const healthScore = calculateHealthScore(metrics, diagnosticData);

        // Step 4: Generate advanced diagnostic prompt
        const prompt = PromptTemplates.generateDiagnosticPrompt(
            enrichedSystem,
            userReport,
            { ...diagnosticData, metrics, healthScore }
        );

        // Step 5: Call AI for intelligent analysis
        const aiResult = await enhancedAIService.analyzeDiagnostic(
            enrichedSystem,
            userReport,
            { ...diagnosticData, customPrompt: prompt }
        );

        // Step 6: Validate AI response
        const validatedResult = PromptTemplates.validateResponse(aiResult, 'diagnostic');

        // Step 7: Enhance with actionable recommendations
        const enhanced = enhanceWithRecommendations(validatedResult, systemInfo, metrics);

        logger.info(`✅ Diagnostic analysis complete - Health Score: ${healthScore}/100, Confidence: ${aiResult.confidence}%`);

        return {
            ...enhanced,
            healthScore,
            metrics,
            metadata_enriched: true,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Error in diagnostic analysis:', error);
        
        // Fallback to rule-based diagnostics
        return generateFallbackDiagnostic(systemInfo, userReport, diagnosticData);
    }
}

/**
 * ============================================================================
 * Collect Diagnostic Metrics
 * ============================================================================
 */
function collectDiagnosticMetrics(systemInfo, diagnosticData) {
    const metrics = {
        thermal: {
            cpuTemp: diagnosticData.cpuTemp || null,
            gpuTemp: diagnosticData.gpuTemp || null,
            ambientTemp: diagnosticData.ambientTemp || 25,
            status: 'unknown'
        },
        power: {
            totalWattage: calculateTotalWattage(systemInfo.components),
            psuWattage: extractPsuWattage(systemInfo.components?.PSU),
            headroom: 0,
            status: 'unknown'
        },
        performance: {
            cpuUsage: diagnosticData.cpuUsage || null,
            ramUsage: diagnosticData.ramUsage || null,
            gpuUsage: diagnosticData.gpuUsage || null,
            status: 'unknown'
        },
        storage: {
            totalSpace: diagnosticData.totalSpace || null,
            usedSpace: diagnosticData.usedSpace || null,
            freeSpace: diagnosticData.freeSpace || null,
            status: 'unknown'
        },
        stability: {
            crashes: diagnosticData.crashes || 0,
            bluescreens: diagnosticData.bluescreens || 0,
            freezes: diagnosticData.freezes || 0,
            status: 'unknown'
        }
    };

    // Analyze thermal status
    if (metrics.thermal.cpuTemp !== null) {
        if (metrics.thermal.cpuTemp > 85) metrics.thermal.status = 'critical';
        else if (metrics.thermal.cpuTemp > 75) metrics.thermal.status = 'warning';
        else if (metrics.thermal.cpuTemp > 65) metrics.thermal.status = 'elevated';
        else metrics.thermal.status = 'normal';
    }

    if (metrics.thermal.gpuTemp !== null) {
        if (metrics.thermal.gpuTemp > 85) metrics.thermal.status = 'critical';
        else if (metrics.thermal.gpuTemp > 80) metrics.thermal.status = 'warning';
    }

    // Analyze power status
    if (metrics.power.psuWattage > 0) {
        metrics.power.headroom = ((metrics.power.psuWattage - metrics.power.totalWattage) / metrics.power.psuWattage) * 100;
        
        if (metrics.power.headroom < 10) metrics.power.status = 'critical';
        else if (metrics.power.headroom < 20) metrics.power.status = 'warning';
        else if (metrics.power.headroom < 30) metrics.power.status = 'adequate';
        else metrics.power.status = 'excellent';
    }

    // Analyze stability
    const totalIssues = metrics.stability.crashes + metrics.stability.bluescreens + metrics.stability.freezes;
    if (totalIssues > 10) metrics.stability.status = 'critical';
    else if (totalIssues > 5) metrics.stability.status = 'warning';
    else if (totalIssues > 0) metrics.stability.status = 'minor';
    else metrics.stability.status = 'stable';

    return metrics;
}

/**
 * ============================================================================
 * Calculate Overall Health Score (0-100)
 * ============================================================================
 */
function calculateHealthScore(metrics, diagnosticData) {
    let score = 100;
    const issues = [];

    // Thermal health (0-25 points deduction)
    if (metrics.thermal.status === 'critical') {
        score -= 25;
        issues.push('Critical thermal issues');
    } else if (metrics.thermal.status === 'warning') {
        score -= 15;
        issues.push('Thermal warnings detected');
    } else if (metrics.thermal.status === 'elevated') {
        score -= 8;
        issues.push('Elevated temperatures');
    }

    // Power health (0-20 points deduction)
    if (metrics.power.status === 'critical') {
        score -= 20;
        issues.push('Critical power delivery issues');
    } else if (metrics.power.status === 'warning') {
        score -= 12;
        issues.push('Power headroom warning');
    } else if (metrics.power.status === 'adequate') {
        score -= 5;
        issues.push('Limited power headroom');
    }

    // Stability health (0-30 points deduction)
    if (metrics.stability.status === 'critical') {
        score -= 30;
        issues.push('Critical stability issues');
    } else if (metrics.stability.status === 'warning') {
        score -= 18;
        issues.push('Frequent stability problems');
    } else if (metrics.stability.status === 'minor') {
        score -= 8;
        issues.push('Minor stability concerns');
    }

    // Performance health (0-15 points deduction)
    if (metrics.performance.cpuUsage > 95) {
        score -= 10;
        issues.push('CPU maxed out');
    } else if (metrics.performance.cpuUsage > 85) {
        score -= 5;
        issues.push('High CPU usage');
    }

    if (metrics.performance.ramUsage > 95) {
        score -= 10;
        issues.push('RAM exhausted');
    } else if (metrics.performance.ramUsage > 85) {
        score -= 5;
        issues.push('High RAM usage');
    }

    // Storage health (0-10 points deduction)
    if (metrics.storage.freeSpace !== null) {
        const freePercent = (metrics.storage.freeSpace / metrics.storage.totalSpace) * 100;
        if (freePercent < 5) {
            score -= 10;
            issues.push('Storage critically low');
        } else if (freePercent < 15) {
            score -= 5;
            issues.push('Storage running low');
        }
    }

    // Ensure score is between 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));

    logger.info(`📊 Health Score: ${score}/100 (${issues.length} issues detected)`);

    return score;
}

/**
 * ============================================================================
 * Calculate Total System Wattage
 * ============================================================================
 */
function calculateTotalWattage(components) {
    let totalWattage = 0;

    // CPU TDP
    if (components?.CPU?.specifications) {
        const cpuTdp = extractTdp(components.CPU.specifications);
        totalWattage += cpuTdp || 125; // Default 125W if not found
    }

    // GPU TDP
    if (components?.GPU?.specifications) {
        const gpuTdp = extractTdp(components.GPU.specifications);
        totalWattage += gpuTdp || 250; // Default 250W if not found
    }

    // Other components (motherboard, RAM, storage, cooling, case fans)
    totalWattage += 100; // Estimated

    return totalWattage;
}

/**
 * ============================================================================
 * Extract TDP from Specifications
 * ============================================================================
 */
function extractTdp(specifications) {
    if (!specifications) return null;
    
    const specStr = JSON.stringify(specifications).toLowerCase();
    const tdpMatch = specStr.match(/(\d+)\s*w(?:att)?/);
    
    return tdpMatch ? parseInt(tdpMatch[1]) : null;
}

/**
 * ============================================================================
 * Extract PSU Wattage
 * ============================================================================
 */
function extractPsuWattage(psu) {
    if (!psu) return 0;
    
    const nameMatch = psu.name?.match(/(\d+)\s*w/i);
    if (nameMatch) return parseInt(nameMatch[1]);
    
    const specMatch = JSON.stringify(psu.specifications)?.match(/(\d+)\s*w/i);
    if (specMatch) return parseInt(specMatch[1]);
    
    return 0;
}

/**
 * ============================================================================
 * Enhance with Actionable Recommendations
 * ============================================================================
 */
function enhanceWithRecommendations(aiResult, systemInfo, metrics) {
    const recommendations = [];

    // Add hardware-specific recommendations
    if (metrics.thermal.status === 'critical' || metrics.thermal.status === 'warning') {
        recommendations.push({
            category: 'thermal',
            priority: 'high',
            action: 'Improve cooling solution',
            details: 'Consider upgrading CPU cooler or adding case fans',
            estimatedCost: 'PHP 2,000 - 5,000',
            difficulty: 'medium'
        });
    }

    if (metrics.power.status === 'critical' || metrics.power.status === 'warning') {
        recommendations.push({
            category: 'power',
            priority: 'high',
            action: 'Upgrade power supply',
            details: `Current: ${metrics.power.psuWattage}W, Recommended: ${Math.ceil(metrics.power.totalWattage * 1.3)}W+`,
            estimatedCost: 'PHP 3,000 - 8,000',
            difficulty: 'medium'
        });
    }

    if (metrics.stability.crashes > 3) {
        recommendations.push({
            category: 'stability',
            priority: 'critical',
            action: 'Address system crashes',
            details: 'Update drivers, check RAM stability, verify temperatures',
            estimatedCost: 'PHP 0 (software) - 3,000 (if hardware replacement needed)',
            difficulty: 'varies'
        });
    }

    // Merge with AI recommendations
    return {
        ...aiResult,
        actionable_recommendations: [
            ...(aiResult.remediationSteps || []).map((step, idx) => ({
                category: 'ai_suggested',
                priority: idx === 0 ? 'high' : 'medium',
                action: step.action || step,
                details: step.details || step.explanation || '',
                estimatedCost: step.estimatedCost || 'Varies',
                difficulty: step.difficulty || 'medium'
            })),
            ...recommendations
        ]
    };
}

/**
 * ============================================================================
 * Fallback Diagnostic (Rule-Based)
 * ============================================================================
 */
function generateFallbackDiagnostic(systemInfo, userReport, diagnosticData) {
    logger.warn('⚠️ Using fallback diagnostic analysis (AI unavailable)');

    const metrics = collectDiagnosticMetrics(systemInfo, diagnosticData);
    const healthScore = calculateHealthScore(metrics, diagnosticData);

    const issues = [];
    const recommendations = [];

    // Analyze thermal
    if (metrics.thermal.status === 'critical') {
        issues.push({
            category: 'thermal',
            severity: 'critical',
            description: 'CPU/GPU temperatures critically high',
            evidence: `CPU: ${metrics.thermal.cpuTemp}°C, GPU: ${metrics.thermal.gpuTemp}°C`
        });
        recommendations.push({
            action: 'Immediate cooling upgrade required',
            priority: 'critical',
            estimatedCost: 'PHP 2,000 - 5,000'
        });
    }

    // Analyze power
    if (metrics.power.status === 'critical') {
        issues.push({
            category: 'power',
            severity: 'critical',
            description: 'Insufficient power supply headroom',
            evidence: `Total: ${metrics.power.totalWattage}W, PSU: ${metrics.power.psuWattage}W (${metrics.power.headroom.toFixed(1)}% headroom)`
        });
        recommendations.push({
            action: 'Upgrade to higher wattage PSU',
            priority: 'high',
            estimatedCost: 'PHP 3,000 - 8,000'
        });
    }

    // Analyze stability
    if (metrics.stability.status === 'critical') {
        issues.push({
            category: 'stability',
            severity: 'critical',
            description: 'Frequent system crashes and errors',
            evidence: `${metrics.stability.crashes} crashes, ${metrics.stability.bluescreens} BSODs, ${metrics.stability.freezes} freezes`
        });
        recommendations.push({
            action: 'Run memory test, update drivers, check temperatures',
            priority: 'critical',
            estimatedCost: 'PHP 0 - 3,000'
        });
    }

    return {
        healthScore,
        overallStatus: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'needs_attention' : 'critical',
        issues,
        recommendations,
        metrics,
        source: 'fallback',
        confidence: 70,
        timestamp: new Date().toISOString()
    };
}

/**
 * ============================================================================
 * Quick Health Check (Lightweight)
 * ============================================================================
 */
async function quickHealthCheck(systemInfo) {
    try {
        const metrics = collectDiagnosticMetrics(systemInfo, {});
        const healthScore = calculateHealthScore(metrics, {});

        return {
            healthScore,
            status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
            quickMetrics: {
                thermal: metrics.thermal.status,
                power: metrics.power.status,
                stability: metrics.stability.status
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error in quick health check:', error);
        return { healthScore: 0, status: 'error', error: error.message };
    }
}

/**
 * ============================================================================
 * Exports
 * ============================================================================
 */
module.exports = {
    analyzeDiagnostic,
    quickHealthCheck,
    calculateHealthScore,
    collectDiagnosticMetrics
};
