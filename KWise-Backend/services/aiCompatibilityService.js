/**
 * AI Compatibility Service
 * Uses Ollama DeepSeek R1 to provide intelligent component compatibility suggestions
 * Considers tier matching, hardware specifications, and bottleneck prevention
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');
const crypto = require('node:crypto');

class AICompatibilityService {
    constructor() {
        this.ollamaService = null;
        this.cacheTimeout = 3600000; // 1 hour
        this.compatibilityCache = new Map();
    }

    /**
     * Initialize Ollama service (lazy loading)
     */
    getOllamaService() {
        if (!this.ollamaService) {
            try {
                this.ollamaService = require('../ai/services/ollamaService');
                logger.info('✅ Ollama service initialized for compatibility checking');
            } catch (error) {
                logger.warn('⚠️  Ollama service not available:', error.message);
                this.ollamaService = null;
            }
        }
        return this.ollamaService;
    }

    /**
     * Get compatible components for a base component using AI
     * @param {Object} baseComponent - The component to find compatibility for
     * @param {String} targetCategory - Category of components to check (e.g., 'GPU', 'CPU')
     * @param {Array} availableComponents - Pool of components to check
     * @returns {Promise<Array>} - Array of compatible components with AI reasoning
     */
    async getCompatibleComponents(baseComponent, targetCategory, availableComponents = []) {
        try {
            logger.info(`🔍 Finding compatible ${targetCategory} for ${baseComponent.category}: ${baseComponent.name}`);

            // Generate cache key
            const cacheKey = this._generateCacheKey(baseComponent, targetCategory);
            
            // Check cache
            if (this.compatibilityCache.has(cacheKey)) {
                const cached = this.compatibilityCache.get(cacheKey);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    logger.info(`📦 Returning cached compatibility results`);
                    return cached.data;
                }
            }

            // If no available components provided, fetch from database
            if (availableComponents.length === 0) {
                availableComponents = await this._getComponentsByCategory(targetCategory);
            }

            // Filter by tier matching first (deterministic pre-filtering)
            const tierFiltered = this._filterByTier(baseComponent, availableComponents);
            
            // Get AI-enhanced compatibility analysis
            const aiCompatible = await this._analyzeWithAI(baseComponent, tierFiltered);

            // Store in cache
            this.compatibilityCache.set(cacheKey, {
                data: aiCompatible,
                timestamp: Date.now()
            });

            return aiCompatible;

        } catch (error) {
            logger.error('❌ Error in getCompatibleComponents:', error);
            // Return tier-filtered results as fallback
            return this._filterByTier(baseComponent, availableComponents);
        }
    }

    /**
     * Filter components by tier matching to prevent bottlenecks
     * Entry pairs with entry/mid-tier
     * Mid-tier pairs with entry/mid-tier/high-tier
     * High-tier pairs with mid-tier/high-tier/elite
     * Elite pairs with high-tier/elite
     */
    _filterByTier(baseComponent, components) {
        const baseTier = (baseComponent.tier || '').toLowerCase();
        
        const tierCompatibilityMatrix = {
            'entry': ['entry', 'mid-tier'],
            'mid-tier': ['entry', 'mid-tier', 'high-tier'],
            'high-tier': ['mid-tier', 'high-tier', 'elite'],
            'elite': ['high-tier', 'elite']
        };

        const compatibleTiers = tierCompatibilityMatrix[baseTier] || ['entry', 'mid-tier', 'high-tier', 'elite'];

        return components.filter(component => {
            const componentTier = (component.tier || '').toLowerCase();
            return compatibleTiers.includes(componentTier);
        }).map(component => ({
            ...component,
            tierMatch: component.tier === baseComponent.tier ? 'perfect' : 'compatible',
            bottleneckRisk: this._assessBottleneckRisk(baseComponent, component)
        }));
    }

    /**
     * Assess bottleneck risk between components
     */
    _assessBottleneckRisk(component1, component2) {
        const tier1 = (component1.tier || '').toLowerCase();
        const tier2 = (component2.tier || '').toLowerCase();

        const tierLevels = { 'entry': 1, 'mid-tier': 2, 'high-tier': 3, 'elite': 4 };
        const level1 = tierLevels[tier1] || 2;
        const level2 = tierLevels[tier2] || 2;

        const difference = Math.abs(level1 - level2);

        if (difference === 0) return 'none';
        if (difference === 1) return 'low';
        if (difference === 2) return 'moderate';
        return 'high';
    }

    /**
     * Analyze compatibility using AI (Ollama DeepSeek R1)
     * ROOT CAUSE FIX: Cold start optimization - keep-alive already active, just need proper config
     */
    async _analyzeWithAI(baseComponent, components) {
        try {
            const ollama = this.getOllamaService();
            
            if (!ollama) {
                logger.warn('⚠️  AI analysis unavailable, returning tier-filtered results');
                return components.slice(0, 10); // Return top 10
            }

            // Prepare prompt for DeepSeek R1
            const systemPrompt = this._buildSystemPrompt();
            const userPrompt = this._buildCompatibilityPrompt(baseComponent, components);
            
            // ROOT CAUSE FIX: Use proper model selection with system prompt
            // - Keep-alive is already active in ollamaService (60s pings)
            // - Use the selected model from health check (deepseek-r1:1.5b by default)
            // - DeepSeek R1 reasoning models need 4000+ tokens for <think> process
            // - Lower temperature (0.1) for deterministic technical analysis
            const aiResponse = await ollama.generateResponse(userPrompt, systemPrompt, {
                temperature: 0.1,  // Very low for consistent compatibility analysis
                max_tokens: 4000,  // Enough for reasoning model <think> tags
                stream: false      // Don't stream for compatibility analysis
            });

            // Parse AI response
            const analysis = this._parseAIResponse(aiResponse);

            // Enhance components with AI insights
            return components.map(component => {
                const aiInsight = analysis.find(a => 
                    a.componentId === component.id || 
                    a.componentName === component.name
                );

                return {
                    ...component,
                    compatibilityScore: aiInsight?.score || 75,
                    aiReasoning: aiInsight?.reasoning || 'Compatible based on tier matching',
                    performanceNotes: aiInsight?.notes || null,
                    recommended: aiInsight?.recommended || component.tier === baseComponent.tier
                };
            }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

        } catch (error) {
            logger.warn('⚠️  AI analysis failed, using fallback:', error.message);
            return components.slice(0, 10);
        }
    }

    /**
     * Build system prompt for compatibility analysis
     * ROOT CAUSE FIX: Separate system prompt for better AI performance
     */
    _buildSystemPrompt() {
        return `You are a PC hardware compatibility expert. Your job is to analyze component compatibility quickly and accurately.

RULES:
1. Consider tier matching (entry, mid-tier, high-tier, elite) to prevent bottlenecks
2. Check hardware specifications (sockets, power requirements, form factors)
3. Prioritize balanced builds - no component should bottleneck others
4. Be concise - analysis should complete in <2 seconds

OUTPUT FORMAT: Valid JSON only
{
  "recommendations": [
    {
      "componentName": "<exact name>",
      "score": <0-100>,
      "reasoning": "<brief 1 sentence>",
      "notes": "<optional technical notes>",
      "recommended": <true/false>
    }
  ]
}`;
    }

    /**
     * Build AI prompt for compatibility analysis
     * ROOT CAUSE FIX: Simplified prompt for faster AI response (<2s target)
     */
    _buildCompatibilityPrompt(baseComponent, components) {
        // Only analyze top 10 components for speed
        const topComponents = components.slice(0, 10);
        
        const componentList = topComponents.map((c, i) => 
            `${i + 1}. ${c.name} | Tier: ${c.tier || 'unknown'} | ₱${c.price}`
        ).join('\n');

        return `Analyze compatibility for these components with the selected base component:

BASE: ${baseComponent.category} - ${baseComponent.name} (Tier: ${baseComponent.tier || 'unknown'})
${baseComponent.specifications ? `Specs: ${JSON.stringify(baseComponent.specifications).slice(0, 200)}` : ''}

CANDIDATES:
${componentList}

Analyze tier matching, hardware compatibility, and bottleneck risks. Return top 10 compatible items.`;
    }

    /**
     * Parse AI response
     */
    _parseAIResponse(aiResponse) {
        try {
            // Extract JSON from response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                logger.warn('⚠️  Could not parse AI response, no JSON found');
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.recommendations || [];
        } catch (error) {
            logger.warn('⚠️  Failed to parse AI response:', error.message);
            return [];
        }
    }

    /**
     * Get components by category from database
     */
    async _getComponentsByCategory(category) {
        try {
            const result = await query(`
                SELECT 
                    id,
                    name,
                    category,
                    brand,
                    price,
                    stock,
                    tier,
                    specifications,
                    image_url,
                    is_active
                FROM pc_parts
                WHERE category = $1
                  AND is_active = true
                  AND stock > 0
                ORDER BY price ASC
                LIMIT 50
            `, [category]);

            return result.rows;
        } catch (error) {
            logger.error('❌ Error fetching components:', error);
            return [];
        }
    }

    /**
     * Generate cache key
     */
    _generateCacheKey(baseComponent, targetCategory) {
        const data = `${baseComponent.id}-${baseComponent.category}-${targetCategory}-${baseComponent.tier}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * Store compatibility recommendation in database
     */
    async storeCompatibilityRecommendation(baseComponent, recommendedComponent, analysis) {
        try {
            await query(`
                INSERT INTO ai_compatibility_recommendations (
                    base_component_id,
                    base_component_category,
                    base_component_tier,
                    recommended_component_id,
                    recommended_component_category,
                    recommended_component_tier,
                    compatibility_score,
                    ai_reasoning,
                    bottleneck_warning,
                    performance_notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT DO NOTHING
            `, [
                baseComponent.id,
                baseComponent.category,
                baseComponent.tier,
                recommendedComponent.id,
                recommendedComponent.category,
                recommendedComponent.tier,
                analysis.score || 75,
                analysis.reasoning || '',
                analysis.bottleneckWarning || null,
                analysis.performanceNotes || null
            ]);

            logger.info('✅ Stored compatibility recommendation');
        } catch (error) {
            logger.error('❌ Error storing recommendation:', error);
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.compatibilityCache.clear();
        logger.info('🗑️  Compatibility cache cleared');
    }
}

// Export singleton instance
module.exports = new AICompatibilityService();

