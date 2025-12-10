/**
 * ============================================================================
 * PERSONA ENGINE - PHASE 3
 * ============================================================================
 * 
 * Detects and classifies users into 5 distinct personas based on behavior,
 * preferences, and purchasing patterns.
 * 
 * Personas:
 * 1. Competitive Gamer - High FPS gaming, competitive titles
 * 2. Content Creator Pro - Video editing, 3D rendering, streaming
 * 3. Budget Optimizer - Maximum value, deals, budget builds
 * 4. Enthusiast Overclocker - Cutting-edge hardware, overclocking
 * 5. Productivity Professional - Workstation builds, reliability
 * 
 * ============================================================================
 */

const logger = require('../utils/logger');
const userContextService = require('./userContextService');
const { query } = require('../config/db');

/**
 * ============================================================================
 * Persona Definitions with Scoring Criteria
 * ============================================================================
 */
const PERSONAS = {
    competitive_gamer: {
        name: 'Competitive Gamer',
        description: 'Focus on high FPS gaming and competitive titles',
        icon: '🎮',
        traits: {
            highEndGPU: 30,           // Points for high-end GPU purchases
            highRefreshMonitor: 25,   // High refresh rate monitors
            gamingPeripherals: 20,    // Gaming keyboards, mice
            streamingSetup: 15,       // Capture cards, microphones
            budgetTier: 10            // Mid to high budget
        },
        thresholdScore: 60
    },
    content_creator_pro: {
        name: 'Content Creator Pro',
        description: 'Video editing, 3D rendering, and content creation',
        icon: '🎬',
        traits: {
            multiCoreCPU: 35,         // Multi-core processors
            highRAM: 30,              // 32GB+ RAM
            fastStorage: 20,          // NVMe SSDs, large capacity
            colorAccurateMonitor: 10, // Professional monitors
            captureEquipment: 5       // Audio/video equipment
        },
        thresholdScore: 60
    },
    budget_optimizer: {
        name: 'Budget Optimizer',
        description: 'Maximum value and best bang for buck',
        icon: '💰',
        traits: {
            lowPriceSearches: 35,     // Frequent low-price filtering
            dealHunting: 30,          // Price alerts, sale items
            budgetBuilds: 25,         // Budget tier components
            valueComponents: 10       // High value_score components
        },
        thresholdScore: 50
    },
    enthusiast_overclocker: {
        name: 'Enthusiast Overclocker',
        description: 'Cutting-edge hardware and overclocking',
        icon: '⚡',
        traits: {
            flagshipCPU: 35,          // Latest flagship CPUs
            premiumCooling: 30,       // High-end AIOs, custom loops
            overclockingMobo: 20,     // Z/X-series motherboards
            premiumPSU: 10,           // 80+ Platinum/Titanium
            RGBEcosystem: 5           // RGB components
        },
        thresholdScore: 65
    },
    productivity_professional: {
        name: 'Productivity Professional',
        description: 'Workstation builds focused on reliability',
        icon: '💼',
        traits: {
            workstationCPU: 30,       // Workstation-class CPUs
            eccRAM: 25,               // ECC memory
            reliabilityFocus: 25,     // Tier A PSUs, enterprise SSDs
            multiMonitor: 15,         // Multiple monitor setups
            professionalGPU: 5        // Quadro/Pro GPUs
        },
        thresholdScore: 60
    }
};

/**
 * ============================================================================
 * Detect User Persona
 * ============================================================================
 */
async function detectPersona(userId) {
    try {
        logger.info(`🎭 Detecting persona for user ${userId}`);

        // Get comprehensive user context
        const context = await userContextService.getUserContext(userId);

        // Score each persona
        const personaScores = {};
        for (const [key, persona] of Object.entries(PERSONAS)) {
            personaScores[key] = await scorePersona(persona, context);
        }

        // Find primary and secondary personas
        const sortedPersonas = Object.entries(personaScores)
            .sort((a, b) => b[1].totalScore - a[1].totalScore);

        const primary = sortedPersonas[0];
        const secondary = sortedPersonas[1];

        const result = {
            userId,
            primary: {
                type: primary[0],
                name: PERSONAS[primary[0]].name,
                description: PERSONAS[primary[0]].description,
                icon: PERSONAS[primary[0]].icon,
                score: primary[1].totalScore,
                confidence: calculateConfidence(primary[1].totalScore, PERSONAS[primary[0]].thresholdScore),
                traits: primary[1].traits
            },
            secondary: secondary[1].totalScore >= (PERSONAS[secondary[0]].thresholdScore * 0.7) ? {
                type: secondary[0],
                name: PERSONAS[secondary[0]].name,
                score: secondary[1].totalScore,
                confidence: calculateConfidence(secondary[1].totalScore, PERSONAS[secondary[0]].thresholdScore)
            } : null,
            allScores: personaScores,
            context: context.computed,
            timestamp: new Date().toISOString()
        };

        logger.info(`✅ Persona detected - Primary: ${result.primary.name} (${result.primary.confidence}% confidence)`);

        // Store in database
        await storePersona(userId, result);

        return result;

    } catch (error) {
        logger.error('Error detecting persona:', error);
        return getDefaultPersona(userId);
    }
}

/**
 * ============================================================================
 * Score Individual Persona
 * ============================================================================
 */
async function scorePersona(persona, context) {
    const traitScores = {};
    let totalScore = 0;

    // Competitive Gamer Scoring
    if (persona.traits.highEndGPU) {
        const gpuScore = scoreHighEndGPU(context);
        traitScores.highEndGPU = gpuScore;
        totalScore += gpuScore;
    }

    if (persona.traits.highRefreshMonitor) {
        const monitorScore = scoreHighRefreshMonitor(context);
        traitScores.highRefreshMonitor = monitorScore;
        totalScore += monitorScore;
    }

    if (persona.traits.gamingPeripherals) {
        const peripheralScore = scoreGamingPeripherals(context);
        traitScores.gamingPeripherals = peripheralScore;
        totalScore += peripheralScore;
    }

    // Content Creator Pro Scoring
    if (persona.traits.multiCoreCPU) {
        const cpuScore = scoreMultiCoreCPU(context);
        traitScores.multiCoreCPU = cpuScore;
        totalScore += cpuScore;
    }

    if (persona.traits.highRAM) {
        const ramScore = scoreHighRAM(context);
        traitScores.highRAM = ramScore;
        totalScore += ramScore;
    }

    if (persona.traits.fastStorage) {
        const storageScore = scoreFastStorage(context);
        traitScores.fastStorage = storageScore;
        totalScore += storageScore;
    }

    // Budget Optimizer Scoring
    if (persona.traits.lowPriceSearches) {
        const priceScore = scoreLowPriceSearches(context);
        traitScores.lowPriceSearches = priceScore;
        totalScore += priceScore;
    }

    if (persona.traits.dealHunting) {
        const dealScore = scoreDealHunting(context);
        traitScores.dealHunting = dealScore;
        totalScore += dealScore;
    }

    if (persona.traits.budgetBuilds) {
        const budgetScore = scoreBudgetBuilds(context);
        traitScores.budgetBuilds = budgetScore;
        totalScore += budgetScore;
    }

    // Enthusiast Overclocker Scoring
    if (persona.traits.flagshipCPU) {
        const flagshipScore = scoreFlagshipCPU(context);
        traitScores.flagshipCPU = flagshipScore;
        totalScore += flagshipScore;
    }

    if (persona.traits.premiumCooling) {
        const coolingScore = scorePremiumCooling(context);
        traitScores.premiumCooling = coolingScore;
        totalScore += coolingScore;
    }

    if (persona.traits.overclockingMobo) {
        const moboScore = scoreOverclockingMobo(context);
        traitScores.overclockingMobo = moboScore;
        totalScore += moboScore;
    }

    // Productivity Professional Scoring
    if (persona.traits.workstationCPU) {
        const workstationScore = scoreWorkstationCPU(context);
        traitScores.workstationCPU = workstationScore;
        totalScore += workstationScore;
    }

    if (persona.traits.reliabilityFocus) {
        const reliabilityScore = scoreReliabilityFocus(context);
        traitScores.reliabilityFocus = reliabilityScore;
        totalScore += reliabilityScore;
    }

    return { totalScore, traits: traitScores };
}

/**
 * ============================================================================
 * Individual Trait Scoring Functions
 * ============================================================================
 */

function scoreHighEndGPU(context) {
    const gpuOrders = context.orders.categoryPreferences
        .find(c => c.category === 'GPU');
    
    if (!gpuOrders) return 0;

    // Check if average GPU spending is high (30k+)
    const avgGPUPrice = context.orders.averageOrderValue;
    if (avgGPUPrice > 40000) return 30;
    if (avgGPUPrice > 30000) return 20;
    if (avgGPUPrice > 20000) return 10;
    return 0;
}

function scoreHighRefreshMonitor(context) {
    // Would check for monitor purchases with >144Hz
    // Simplified: check if user searches for gaming keywords
    const gamingKeywords = context.interactions.favoriteCategories
        .filter(c => c.category?.toLowerCase().includes('game'));
    
    return gamingKeywords.length > 0 ? 15 : 0;
}

function scoreGamingPeripherals(context) {
    // Check for gaming peripheral purchases
    return context.orders.total > 3 ? 10 : 0;
}

function scoreMultiCoreCPU(context) {
    const cpuOrders = context.orders.categoryPreferences
        .find(c => c.category === 'CPU');
    
    // Check if user tends to buy high-core CPUs
    if (!cpuOrders) return 0;
    if (cpuOrders.count > 2) return 35;
    if (cpuOrders.count > 0) return 20;
    return 0;
}

function scoreHighRAM(context) {
    const ramOrders = context.orders.categoryPreferences
        .find(c => c.category === 'RAM');
    
    // Check RAM orders (32GB+ would score high)
    if (!ramOrders) return 0;
    return ramOrders.count * 10;
}

function scoreFastStorage(context) {
    const storageOrders = context.orders.categoryPreferences
        .find(c => c.category === 'Storage');
    
    if (!storageOrders) return 0;
    return Math.min(storageOrders.count * 7, 20);
}

function scoreLowPriceSearches(context) {
    const avgPrice = context.interactions.priceRange.average;
    
    if (avgPrice < 15000) return 35;
    if (avgPrice < 25000) return 20;
    return 0;
}

function scoreDealHunting(context) {
    // Check if user has price alerts enabled
    const hasPriceAlerts = context.preferences.priceAlerts;
    return hasPriceAlerts ? 30 : 0;
}

function scoreBudgetBuilds(context) {
    const budgetTier = context.computed.budgetTier;
    
    if (budgetTier === 'budget') return 25;
    if (budgetTier === 'budget_conscious') return 15;
    return 0;
}

function scoreFlagshipCPU(context) {
    const avgSpending = context.orders.averageOrderValue;
    
    if (avgSpending > 80000) return 35;
    if (avgSpending > 50000) return 20;
    return 0;
}

function scorePremiumCooling(context) {
    const coolingOrders = context.orders.categoryPreferences
        .find(c => c.category === 'Cooling');
    
    if (!coolingOrders) return 0;
    return Math.min(coolingOrders.count * 12, 30);
}

function scoreOverclockingMobo(context) {
    const moboOrders = context.orders.categoryPreferences
        .find(c => c.category === 'Motherboard');
    
    if (!moboOrders) return 0;
    return Math.min(moboOrders.count * 10, 20);
}

function scoreWorkstationCPU(context) {
    const primaryUse = context.computed.primaryUseCase;
    
    if (primaryUse === 'workstation') return 30;
    if (primaryUse === 'content_creation') return 20;
    return 0;
}

function scoreReliabilityFocus(context) {
    const budgetTier = context.computed.budgetTier;
    
    if (budgetTier === 'enthusiast' || budgetTier === 'high_end') return 25;
    return 10;
}

/**
 * ============================================================================
 * Helper Functions
 * ============================================================================
 */

function calculateConfidence(score, threshold) {
    const ratio = score / threshold;
    
    if (ratio >= 1.5) return 95;
    if (ratio >= 1.2) return 85;
    if (ratio >= 1.0) return 75;
    if (ratio >= 0.8) return 65;
    if (ratio >= 0.6) return 50;
    return 40;
}

function getDefaultPersona(userId) {
    return {
        userId,
        primary: {
            type: 'budget_optimizer',
            name: 'Budget Optimizer',
            description: 'Maximum value and best bang for buck',
            icon: '💰',
            score: 0,
            confidence: 50,
            traits: {}
        },
        secondary: null,
        allScores: {},
        context: {
            experienceLevel: 'novice',
            budgetTier: 'budget',
            primaryUseCase: 'general'
        },
        timestamp: new Date().toISOString()
    };
}

/**
 * ============================================================================
 * Store Persona in Database
 * ============================================================================
 */
async function storePersona(userId, personaData) {
    try {
        await query(`
            INSERT INTO user_personas (
                user_id, primary_persona, secondary_persona,
                confidence_score, persona_traits, detected_at
            )
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (user_id) 
            DO UPDATE SET
                primary_persona = EXCLUDED.primary_persona,
                secondary_persona = EXCLUDED.secondary_persona,
                confidence_score = EXCLUDED.confidence_score,
                persona_traits = EXCLUDED.persona_traits,
                detected_at = NOW()
        `, [
            userId,
            personaData.primary.type,
            personaData.secondary?.type || null,
            personaData.primary.confidence,
            JSON.stringify(personaData.primary.traits)
        ]);

        logger.info(`✅ Persona stored for user ${userId}`);
    } catch (error) {
        logger.error('Error storing persona:', error);
    }
}

/**
 * ============================================================================
 * Get Stored Persona
 * ============================================================================
 */
async function getStoredPersona(userId) {
    try {
        const result = await query(`
            SELECT 
                primary_persona, secondary_persona,
                confidence_score, persona_traits, detected_at
            FROM user_personas
            WHERE user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return null;
        }

        const data = result.rows[0];
        const primaryType = data.primary_persona;

        return {
            userId,
            primary: {
                type: primaryType,
                name: PERSONAS[primaryType]?.name || primaryType,
                description: PERSONAS[primaryType]?.description || '',
                icon: PERSONAS[primaryType]?.icon || '👤',
                confidence: data.confidence_score,
                traits: data.persona_traits
            },
            secondary: data.secondary_persona ? {
                type: data.secondary_persona,
                name: PERSONAS[data.secondary_persona]?.name || data.secondary_persona
            } : null,
            detectedAt: data.detected_at
        };

    } catch (error) {
        logger.error('Error fetching stored persona:', error);
        return null;
    }
}

/**
 * ============================================================================
 * Exports
 * ============================================================================
 */
module.exports = {
    detectPersona,
    getStoredPersona,
    PERSONAS
};
