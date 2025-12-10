/**
 * Enhanced AI Service for K-Wise
 * Integrates Ollama DeepSeek R1 with:
 * - Intelligent 3-tier caching
 * - Circuit breaker pattern
 * - Structured prompt templates
 * - Fallback response generation
 * - Performance monitoring
 * - Robust JSON extraction from AI responses
 * 
 * @module EnhancedAIService
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const ollamaService = require('../ai/services/ollamaService');
const intelligentCache = require('./intelligentCache');
const aiCircuitBreaker = require('./aiCircuitBreaker');
const PromptTemplates = require('./promptTemplates');
const JSONExtractor = require('../ai/utils/jsonExtractor');
const logger = require('../utils/logger');
const crypto = require('crypto');

// PHASE 4 & 5: Optional advanced features (graceful degradation if not available)
let MetadataEnrichmentService, aiLogger, embeddingService, promptExperimentManager;

try {
  MetadataEnrichmentService = require('./metadataEnrichmentService');
} catch (e) {
  logger.warn('⚠️ MetadataEnrichmentService not available - using basic metadata');
  MetadataEnrichmentService = { enrichPartsMetadata: async (parts) => ({}) };
}

try {
  aiLogger = require('./aiLogger');
} catch (e) {
  logger.warn('⚠️ AI Logger not available - logging disabled');
  aiLogger = { logAICall: async () => {}, logMetrics: async () => {} };
}

try {
  embeddingService = require('./embeddingService');
} catch (e) {
  logger.warn('⚠️ Embedding Service not available - similar builds disabled');
  embeddingService = { findSimilarBuilds: async () => [], extractPatterns: async () => ({}) };
}

try {
  promptExperimentManager = require('./promptExperimentManager');
} catch (e) {
  logger.warn('⚠️ Prompt Experiment Manager not available - A/B testing disabled');
  promptExperimentManager = { selectVariant: (exp) => ({ template: exp, variant: 'default' }) };
}

class EnhancedAIService {
  constructor() {
    this.initialized = false;
    this.scenarios = ['compatibility', 'upgrade', 'reference_build', 'diagnostic', 'cleaning', 'future_upgrade'];
    
    logger.info('🚀 Enhanced AI Service initializing...');
    this.initialize();
  }

  async initialize() {
    try {
      // Test Ollama connection
      const isConnected = await ollamaService.testConnection();
      
      if (isConnected) {
        logger.info('✅ Enhanced AI Service initialized successfully');
        this.initialized = true;
      } else {
        logger.warn('⚠️ Ollama not available - AI features will use fallbacks');
        this.initialized = false;
      }
    } catch (error) {
      logger.error('❌ Enhanced AI Service initialization failed', { error: error.message });
      this.initialized = false;
    }
  }

  /**
   * Analyze compatibility with intelligent caching and circuit breaker
   * ENHANCED PHASE 2: Now uses advanced prompt templates and metadata enrichment
   * ENHANCED PHASE 4: Now logs all AI calls with comprehensive metrics
   * ENHANCED PHASE 5: Now uses vector embeddings and A/B testing
   * @param {Object} parts - Build parts configuration
   * @param {Object} userContext - User context (persona, budget, preferences)
   * @param {Object} deterministicResults - Results from deterministic rules
   * @returns {Promise<Object>} - Compatibility analysis
   */
  async analyzeCompatibility(parts, userContext = {}, deterministicResults = {}) {
    const scenario = 'compatibility';
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = intelligentCache.generateKey(parts, userContext, scenario);
      
      // Check cache first
      const cached = await intelligentCache.get(cacheKey, scenario);
      if (cached) {
        logger.info('✅ Compatibility analysis (CACHE HIT)', {
          latency: `${Date.now() - startTime}ms`
        });
        
        // PHASE 4: Log cache hit
        await aiLogger.logAICall(scenario, { parts, userContext }, cached, 0);
        
        return {
          ...cached,
          source: 'cache',
          cached: true
        };
      }
      
      // PHASE 2 ENHANCEMENT: Enrich parts with metadata
      const metadata = await MetadataEnrichmentService.enrichPartsMetadata(parts);
      
      // PHASE 5: Find similar builds using vector embeddings
      let similarBuilds = [];
      let patterns = {};
      try {
        similarBuilds = await embeddingService.findSimilarBuilds(parts, 5);
        if (similarBuilds && similarBuilds.length > 0) {
          patterns = await embeddingService.extractPatterns(similarBuilds);
          logger.info('🔍 Found similar builds', { 
            count: similarBuilds.length,
            avgSimilarity: (similarBuilds.reduce((sum, b) => sum + b.similarity, 0) / similarBuilds.length).toFixed(2)
          });
        }
      } catch (embError) {
        logger.warn('⚠️ Embedding service unavailable, continuing without similar builds', { error: embError.message });
      }
      
      // PHASE 5: Check for active A/B experiments
      let selectedVariant = null;
      let experimentId = null;
      try {
        const activeExperiments = await promptExperimentManager.getActiveExperiments();
        const compatExperiment = activeExperiments.find(exp => exp.experiment_id.includes('compatibility'));
        if (compatExperiment) {
          experimentId = compatExperiment.experiment_id;
          const userId = userContext.user_id || 'anonymous';
          selectedVariant = await promptExperimentManager.selectVariant(experimentId, userId);
          logger.info('🧪 A/B experiment active', { experimentId, variant: selectedVariant.variant_id });
        }
      } catch (expError) {
        logger.warn('⚠️ Experiment manager unavailable, using default prompts', { error: expError.message });
      }
      
      // PHASE 2 ENHANCEMENT: Use advanced prompt template
      let prompt = PromptTemplates.generateCompatibilityPrompt(
        parts, 
        userContext, 
        deterministicResults,
        metadata
      );
      
      // PHASE 5: Enrich prompt with similar builds if available
      if (similarBuilds.length > 0) {
        prompt = embeddingService.enrichPromptWithSimilarBuilds(prompt, similarBuilds, patterns);
      }
      
      // PHASE 5: Use experiment variant prompt if applicable
      if (selectedVariant && selectedVariant.prompt_template) {
        prompt.task = selectedVariant.prompt_template;
        logger.info('🧪 Using A/B variant prompt', { variant: selectedVariant.variant_id });
      }
      
      // PHASE 3.2 WEEK 2: Check AI Response Cache before making API call
      let aiCacheKey = null;
      let aiCachedResponse = null;
      try {
        const aiResponseCache = require('./aiResponseCache');
        aiCacheKey = prompt.task + JSON.stringify(parts);
        aiCachedResponse = aiResponseCache.get(aiCacheKey, { userContext, deterministicResults });
        
        if (aiCachedResponse) {
          logger.info('✅ AI Response Cache HIT - returning cached response', {
            scenario,
            cacheAge: Math.floor((Date.now() - aiCachedResponse.cachedAt) / 1000) + 's'
          });
          
          // Record cache hit metrics
          if (global.prometheusMetrics) {
            global.prometheusMetrics.recordAiRequest(
              'deepseek-r1:1.5b',
              scenario,
              Date.now() - startTime,
              'hit',
              'success',
              0 // No tokens used for cache hit
            );
          }
          
          return aiCachedResponse;
        } else {
          logger.info('⚠️ AI Response Cache MISS - calling Ollama', { scenario });
        }
      } catch (cacheError) {
        logger.warn('⚠️ AI Response Cache check failed:', cacheError.message);
        // Continue without cache
      }
      
      // Call AI with circuit breaker protection
      const fallback = this.generateFallbackCompatibility(parts, deterministicResults);
      
      const result = await aiCircuitBreaker.call(
        async () => {
          return await ollamaService.generateResponse(
            prompt.task,
            prompt.system,
            { max_tokens: 3000, temperature: 0.1 }
          );
        },
        fallback,
        { scenario, partsCount: Object.keys(parts).length }
      );
      
      const latency = Date.now() - startTime;
      
      // Parse and validate AI response
      let parsedResult;
      if (result.success) {
        // 🔧 NULL-SAFE ACCESS: Handle all response structures
        const responseData = result.data || result.response || result || '';
        parsedResult = this.parseCompatibilityResponse(responseData, deterministicResults);
        
        // PHASE 2 ENHANCEMENT: Validate against JSON schema
        const validation = PromptTemplates.validateResponse(parsedResult, scenario);
        if (!validation.valid) {
          logger.warn('⚠️ AI response validation warnings', { errors: validation.errors });
        }
        
        // 🔧 WEEK 2 OPTIMIZATION: Lower confidence threshold for caching (50% instead of 70%)
        const cacheConfidence = parsedResult.confidence || 70;
        if (cacheConfidence >= 50) {
          // Cache successful result with lower threshold to improve hit rate
          intelligentCache.set(
            cacheKey,
            parsedResult,
            scenario,
            cacheConfidence
          );
        }
        
        // PHASE 3.2 WEEK 2: Store in AI Response Cache for future requests
        try {
          if (aiCacheKey && cacheConfidence >= 60) {
            const aiResponseCache = require('./aiResponseCache');
            const ttl = cacheConfidence >= 80 ? 7200 : 3600; // 2 hours for high confidence, 1 hour otherwise
            aiResponseCache.set(
              aiCacheKey,
              { userContext, deterministicResults },
              parsedResult,
              ttl
            );
            logger.info('💾 Stored in AI Response Cache', { scenario, ttl: `${ttl}s`, confidence: cacheConfidence });
          }
        } catch (cacheStoreError) {
          logger.warn('⚠️ Failed to store in AI Response Cache:', cacheStoreError.message);
        }
        
        // PHASE 4: Log successful AI call
        await aiLogger.logAICall(scenario, { parts, userContext, deterministicResults }, parsedResult, latency);
        
        // PHASE 3.2 WEEK 2: Record AI metrics in Prometheus
        if (global.prometheusMetrics) {
          global.prometheusMetrics.recordAiRequest(
            'deepseek-r1:1.5b',
            scenario,
            latency,
            'miss',
            'success',
            result.tokensUsed || 0
          );
        }
        
        // PHASE 5: Record experiment outcome if active
        if (experimentId && selectedVariant) {
          await promptExperimentManager.recordOutcome(experimentId, selectedVariant.variant_id, {
            conversion: parsedResult.confidence >= 80,
            confidence: parsedResult.confidence,
            latency,
            feedback: null // Will be set later by admin
          });
        }
        
        logger.info('✅ Compatibility analysis (AI Enhanced)', {
          latency: `${latency}ms`,
          confidence: parsedResult.confidence,
          source: result.source,
          metadata_enriched: true,
          similar_builds_used: similarBuilds.length
        });
      } else {
        parsedResult = result.data;
        
        // PHASE 4: Log fallback usage
        await aiLogger.logAICall(scenario, { parts, userContext, deterministicResults }, parsedResult, latency);
        
        // PHASE 5: Record experiment error if active
        if (experimentId && selectedVariant) {
          await promptExperimentManager.recordOutcome(experimentId, selectedVariant.variant_id, {
            conversion: false,
            confidence: parsedResult.confidence || 0,
            latency,
            error: true
          });
        }
        
        logger.warn('⚠️ Compatibility analysis (FALLBACK)', {
          latency: `${latency}ms`,
          reason: result.reason
        });
      }
      
      return {
        ...parsedResult,
        source: result.source,
        latency,
        circuitState: result.circuitState,
        metadata_enriched: true,
        similar_builds_used: similarBuilds.length,
        experiment_variant: selectedVariant ? selectedVariant.variant_id : null
      };
      
    } catch (error) {
      logger.error('❌ Compatibility analysis failed', { error: error.message });
      
      // PHASE 4: Log error
      const errorLatency = Date.now() - startTime;
      await aiLogger.logAICall(scenario, { parts, userContext, deterministicResults }, { error: error.message }, errorLatency);
      
      return this.generateFallbackCompatibility(parts, deterministicResults);
    }
  }

  /**
   * Build compatibility analysis prompt
   * @param {Object} parts - Build parts
   * @param {Object} userContext - User context
   * @param {Object} deterministicResults - Deterministic rule results
   * @returns {Object} - Prompt object
   */
  buildCompatibilityPrompt(parts, userContext, deterministicResults) {
    const systemPrompt = `You are an expert PC hardware compatibility analyst with deep knowledge of component interactions, power delivery, thermal management, and real-world performance. Analyze the provided build using both technical specifications and practical experience patterns.

CRITICAL: Respond ONLY with valid JSON. No explanations or additional text.`;

    const userIntent = userContext.primary_use || userContext.use_case || 'general';
    const budgetInfo = userContext.budget ? `$${userContext.budget.min || 0}-$${userContext.budget.max || 0}` : 'unspecified';
    
    const taskPrompt = `Analyze this PC build for compatibility issues beyond the deterministic checks already performed.

<build_parts>
${JSON.stringify(parts, null, 2)}
</build_parts>

<deterministic_rules_verdict>
${JSON.stringify(deterministicResults, null, 2)}
</deterministic_rules_verdict>

<user_context>
Purpose: ${userIntent}
Budget: ${budgetInfo}
Experience Level: ${userContext.experience_level || 'intermediate'}
</user_context>

Focus on:
1. **Power Delivery Quality**: Evaluate PSU tier, cable quality, transient response
2. **Thermal Ecosystem**: Assess case airflow, cooler adequacy, VRM thermal capacity
3. **Real-World Bottlenecks**: Identify performance mismatches
4. **Upgrade Path Viability**: Comment on future-proofing and expansion limitations
5. **Nuanced Warnings**: Flag issues like "Technically compatible but 80+ community reports thermal throttling"

CRITICAL: Do NOT repeat deterministic findings. Only add insights beyond basic checks.

Return strictly valid JSON (NO PLACEHOLDER TEXT - fill with actual analysis):
{
  "overall_assessment": "excellent|good|acceptable|problematic",
  "confidence": 0-100,
  "issues": [
    {
      "severity": "critical|warning|info",
      "category": "power|thermal|performance|future_proofing",
      "description": "concise issue description",
      "evidence": "why this matters",
      "recommendation": "specific actionable fix",
      "confidence": 0-100
    }
  ],
  "strengths": ["IMPORTANT: List actual positive aspects of THIS build, not placeholder text"],
  "upgrade_priorities": ["IMPORTANT: List actual upgrades if applicable, not placeholder text"],
  "reasoning": "IMPORTANT: Write actual 2-3 sentence summary of YOUR analysis, not 'reasoning' or placeholder"
}`;

    return {
      system: systemPrompt,
      task: taskPrompt
    };
  }

  /**
   * Parse and validate compatibility response from AI
   * @param {String} response - Raw AI response
   * @param {Object} deterministicResults - Deterministic results for merging
   * @returns {Object} - Parsed compatibility analysis
   */
  parseCompatibilityResponse(response, deterministicResults) {
    try {
      // ✅ ENHANCED DIAGNOSTIC: Log FULL raw response to see what AI is returning
      logger.info('=== 🔍 AI RESPONSE DEBUG START ===');
      logger.info(`🔍 Response Type: ${typeof response}`);
      logger.info(`🔍 Response Length: ${response?.length || 0}`);
      logger.info(`🔍 First 1000 chars: ${response?.substring(0, 1000) || 'null'}`);
      if (response && response.length > 1000) {
        logger.info(`🔍 Last 500 chars: ${response?.substring(response.length - 500) || 'null'}`);
      }
      logger.info('=== 🔍 AI RESPONSE DEBUG END ===');
      
      // 🔥 FIX #1.2: Use robust JSON extractor with retry logic for DeepSeek R1 responses
      let parsed = JSONExtractor.extractJSON(response);
      
      if (!parsed) {
        logger.warn('⚠️ First JSON extraction attempt failed, trying cleanup...', {
          responseLength: response?.length || 0,
          responseStart: response?.substring(0, 200) || 'null'
        });
        
        // Retry with cleaned response (remove thinking tags, markdown, etc.)
        const cleaned = JSONExtractor.cleanResponse(response);
        parsed = JSONExtractor.extractJSON(cleaned);
        
        if (!parsed) {
          logger.error('❌ All JSON extraction attempts failed:', {
            responseLength: response?.length || 0,
            responseStart: response?.substring(0, 200) || 'null',
            cleanedStart: cleaned?.substring(0, 200) || 'null',
            fullResponse: response // ✅ Log full response for debugging
          });
          throw new Error('No JSON found in response after multiple extraction attempts');
        } else {
          logger.info('✅ JSON extracted after cleanup');
        }
      }
      
      // 🔥 ROOT CAUSE FIX #1: AI returns various field names instead of "compatible_products"
      // Normalize ALL possible field name variations
      const possibleFieldNames = [
        'compatible',  // ✅ FIX: AI often returns just "compatible" instead of "compatible_products"
        'compatible_components', // ✅ FIX: AI returns "compatible_components" instead of "compatible_products"
        'compatible_cores', 
        'compatible_coolers', 
        'compatible_cooling', 
        'compatible_motherboards',
        'compatible_gpus',
        'compatible_rams',
        'compatible_storage',
        'compatible_psus',
        'compatible_cases'
      ];
      
      for (const fieldName of possibleFieldNames) {
        if (parsed[fieldName] && !parsed.compatible_products) {
          logger.warn(`⚠️ AI returned "${fieldName}" instead of "compatible_products", normalizing...`);
          parsed.compatible_products = parsed[fieldName];
          delete parsed[fieldName];
          break;
        }
      }
      
      // Validate required fields (more flexible now)
      if (!parsed.overall_assessment && !parsed.compatible_products) {
        logger.error('❌ Missing required fields in AI response', {
          parsedKeys: Object.keys(parsed),
          parsed: parsed
        });
        throw new Error('Missing required fields in AI response (need overall_assessment or compatible_products)');
      }
      
      // ✅ ENHANCED DIAGNOSTIC: Log what was successfully parsed
      logger.info('=== ✅ PARSED JSON DEBUG START ===');
      logger.info(`✅ Parsed Keys: ${Object.keys(parsed).join(', ')}`);
      logger.info(`✅ Has compatible_products: ${!!parsed.compatible_products}`);
      logger.info(`✅ compatible_products type: ${Array.isArray(parsed.compatible_products) ? 'array' : typeof parsed.compatible_products}`);
      logger.info(`✅ compatible_products value:`, parsed.compatible_products);
      logger.info(`✅ compatible_products length: ${parsed.compatible_products?.length || 0}`);
      logger.info(`✅ Has scores: ${!!parsed.scores}`);
      logger.info(`✅ Has reasons: ${!!parsed.reasons}`);
      logger.info(`✅ Parsed object:`, JSON.stringify(parsed, null, 2));
      logger.info('=== ✅ PARSED JSON DEBUG END ===');
      
      // ROOT CAUSE FIX #6: Preserve ALL fields from AI response, especially compatible_products!
      // The AI returns: compatible_products, scores, reasons
      // We were only keeping: overall_assessment, confidence, issues, strengths, upgrade_priorities
      // This caused compatible_products to be lost, triggering "AI response invalid" warnings
      const merged = {
        // Compatibility response fields (from compatibilityService prompt)
        compatible_products: parsed.compatible_products || [],
        scores: parsed.scores || {},
        reasons: parsed.reasons || {},
        
        // Upgrade response fields  
        overall_assessment: parsed.overall_assessment || 'compatible',
        confidence: parsed.confidence || 85,
        issues: [
          ...(deterministicResults.issues || []),
          ...(parsed.issues || [])
        ],
        strengths: parsed.strengths || [],
        upgrade_priorities: parsed.upgrade_priorities || [],
        reasoning: parsed.reasoning || 'AI analysis completed',
        deterministic_score: deterministicResults.percentageScore || 0,
        ai_score: parsed.confidence || 0,
        data_sources: {
          deterministic: true,
          ai: true
        }
      };
      
      return merged;
      
    } catch (error) {
      logger.error('❌ Failed to parse AI compatibility response', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate fallback compatibility analysis
   * @param {Object} parts - Build parts
   * @param {Object} deterministicResults - Deterministic results
   * @returns {Object} - Fallback analysis
   */
  generateFallbackCompatibility(parts, deterministicResults = {}) {
    const status = deterministicResults.compatible !== false ? 'acceptable' : 'problematic';
    
    // 🔥 FIX #1.3: Use deterministic scores instead of flat 70 for ALL products
    // This ensures different products get different scores based on actual compatibility
    const compatibleProducts = [];
    const scores = {};
    const reasons = {};
    
    // Extract candidate products from parts object
    if (parts.candidates && Array.isArray(parts.candidates)) {
      parts.candidates.forEach(product => {
        if (product.id) {
          // Check if this product has deterministic results
          const detResult = deterministicResults[product.id];
          const detScore = detResult?.percentageScore || 0;
          const isCompatible = detResult?.compatible !== false;
          
          // Only include compatible products in the list
          if (isCompatible && detScore >= 60) {
            compatibleProducts.push(product.id);
            // Use actual deterministic score instead of flat 70
            scores[product.id] = Math.max(60, Math.min(95, detScore)); // Clamp to 60-95 range
            reasons[product.id] = `Compatibility: ${detScore}% based on technical specifications (AI unavailable)`;
          } else if (detScore > 0) {
            // Still provide score for incompatible products (for bulk analysis)
            scores[product.id] = detScore;
            reasons[product.id] = `Incompatible: ${detResult?.issues?.[0]?.message || 'Technical mismatch detected'}`;
          } else {
            // No deterministic data available, use conservative score
            scores[product.id] = 65;
            reasons[product.id] = 'Limited compatibility data available (AI analysis recommended)';
          }
        }
      });
    }
    
    return {
      overall_assessment: status,
      confidence: 60,
      compatible_products: compatibleProducts, // 🔥 FIX: Only compatible products (60%+ score)
      scores: scores, // 🔥 FIX: Use deterministic scores (NOT flat 70!)
      reasons: reasons, // 🔥 FIX: Provide actual reasoning
      issues: (deterministicResults.issues || []).map(issue => ({
        ...issue,
        description: `${issue.message || issue.description} (AI analysis unavailable)`,
        evidence: 'Based on deterministic rules only',
        confidence: 60
      })),
      strengths: status === 'acceptable' 
        ? ['All technical specifications meet compatibility requirements']
        : [],
      upgrade_priorities: [],
      reasoning: 'Compatibility assessed using deterministic rules. AI enhancement unavailable - consider admin review for complex builds.',
      deterministic_score: deterministicResults.percentageScore || 0,
      data_sources: {
        deterministic: true,
        ai: false
      },
      ai_available: false,
      fallback: true
    };
  }

  /**
   * Analyze upgrade recommendations
   * @param {Object} currentBuild - Current build configuration
   * @param {Object} userContext - User context
   * @param {Object} options - Options (budget, timeline, etc.)
   * @returns {Promise<Object>} - Upgrade recommendations
   */
  async analyzeUpgrades(currentBuild, userContext = {}, options = {}) {
    const scenario = 'upgrade';
    const startTime = Date.now();
    
    try {
      // Generate cache key
      const cacheKey = intelligentCache.generateKey(currentBuild, userContext, scenario);
      
      // Check cache
      const cached = await intelligentCache.get(cacheKey, scenario);
      if (cached) {
        return {
          ...cached,
          source: 'cache',
          cached: true
        };
      }
      
      // Build upgrade prompt
      const prompt = this.buildUpgradePrompt(currentBuild, userContext, options);
      
      // Call AI with circuit breaker
      const fallback = this.generateFallbackUpgrades(currentBuild, options);
      
      const result = await aiCircuitBreaker.call(
        async () => {
          return await ollamaService.generateResponse(
            prompt.task,
            prompt.system,
            { max_tokens: 3000, temperature: 0.2 }
          );
        },
        fallback,
        { scenario }
      );
      
      const latency = Date.now() - startTime;
      
      // Parse result
      let parsedResult;
      if (result.success) {
        parsedResult = this.parseUpgradeResponse(result.data);
        
        // Cache result
        intelligentCache.set(cacheKey, parsedResult, scenario, parsedResult.confidence || 75);
        
        logger.info('✅ Upgrade analysis (AI)', { latency: `${latency}ms` });
      } else {
        parsedResult = result.data;
        logger.warn('⚠️ Upgrade analysis (FALLBACK)', { reason: result.reason });
      }
      
      return {
        ...parsedResult,
        source: result.source,
        latency
      };
      
    } catch (error) {
      logger.error('❌ Upgrade analysis failed', { error: error.message });
      return this.generateFallbackUpgrades(currentBuild, options);
    }
  }

  /**
   * Build upgrade recommendation prompt
   * @param {Object} currentBuild - Current build
   * @param {Object} userContext - User context
   * @param {Object} options - Upgrade options
   * @returns {Object} - Prompt object
   */
  buildUpgradePrompt(currentBuild, userContext, options) {
    const systemPrompt = `You are a PC upgrade strategist specializing in cost-effective performance improvements and future-proof planning. Recommend upgrades based on bottleneck analysis, budget constraints, and user workload evolution.

CRITICAL: Respond ONLY with valid JSON. No explanations.`;

    const taskPrompt = `Design a phased upgrade roadmap that maximizes performance per dollar.

<current_build>
${JSON.stringify(currentBuild, null, 2)}
</current_build>

<user_budget>
Immediate: $${options.immediateBudget || 0}
6-month: $${options.sixMonthBudget || 0}
12-month: $${options.annualBudget || 0}
</user_budget>

<user_context>
Primary Use: ${userContext.primary_use || 'general'}
Performance Target: ${userContext.performance_target || 'balanced'}
</user_context>

Prioritize:
1. **Immediate Impact Upgrades** (resolve current bottlenecks)
2. **6-Month Targets** (capitalize on price drops)
3. **12-Month Vision** (complete transformation)

Return strictly valid JSON:
{
  "immediate_upgrades": [
    {
      "component": "gpu|cpu|ram|storage|psu|cooler",
      "current": "current part",
      "recommended": "specific new part",
      "cost": 299.99,
      "performance_gain": "+35% FPS in gaming",
      "priority": 1-5,
      "reasoning": "Why this first",
      "compatibility_notes": "Ensure PSU has 2x8pin PCIe",
      "roi_score": 0-100
    }
  ],
  "six_month_plan": [],
  "twelve_month_vision": [],
  "total_cost_estimate": { "immediate": 0, "six_month": 0, "annual": 0 },
  "market_timing_advice": "Notable upcoming releases or sales"
}`;

    return {
      system: systemPrompt,
      task: taskPrompt
    };
  }

  /**
   * Parse upgrade response
   * @param {String} response - Raw AI response
   * @returns {Object} - Parsed upgrade recommendations
   */
  parseUpgradeResponse(response) {
    try {
      // 🔧 FIX #2: Use JSONExtractor instead of manual parsing
      const parsed = JSONExtractor.extractJSON(response);
      
      if (!parsed) {
        throw new Error('No JSON found in upgrade response');
      }
      
      return {
        ...parsed,
        confidence: 75,
        ai_generated: true
      };
      
    } catch (error) {
      logger.error('❌ Failed to parse upgrade response', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate fallback upgrade recommendations
   * @param {Object} currentBuild - Current build
   * @param {Object} options - Options
   * @returns {Object} - Fallback upgrades
   */
  generateFallbackUpgrades(currentBuild, options = {}) {
    return {
      immediate_upgrades: [],
      six_month_plan: [],
      twelve_month_vision: [],
      total_cost_estimate: {
        immediate: 0,
        six_month: 0,
        annual: 0
      },
      market_timing_advice: 'AI upgrade analysis unavailable. Consult with staff for personalized recommendations.',
      confidence: 50,
      ai_available: false,
      fallback: true
    };
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return intelligentCache.getStats();
  }

  /**
   * Get circuit breaker status
   * @returns {Object} - Circuit breaker status
   */
  getCircuitBreakerStatus() {
    return aiCircuitBreaker.getStatus();
  }

  /**
   * Invalidate cache by part ID
   * @param {Number} partId - Part ID that changed
   */
  invalidateCacheByPart(partId) {
    intelligentCache.invalidateByPart(partId);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    intelligentCache.clear();
  }
}

// Create singleton instance
const enhancedAIService = new EnhancedAIService();

module.exports = enhancedAIService;
