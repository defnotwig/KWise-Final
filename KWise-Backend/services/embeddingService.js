/**
 * Embedding Service - Vector Embeddings for Semantic Build Search
 * Uses Ollama nomic-embed-text model for generating embeddings
 * Finds similar historical builds to enhance AI recommendations
 * 
 * @module EmbeddingService
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const axios = require('axios');
const logger = require('../utils/logger');
const db = require('../config/db');
const crypto = require('crypto');
const aiCircuitBreaker = require('./aiCircuitBreaker');

class EmbeddingService {
  constructor() {
    this.embeddingCache = new Map();
    this.cacheSize = 500; // Keep last 500 embeddings in memory
    this.model = 'nomic-embed-text'; // Lightweight embedding model
    this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    logger.info('🧠 Embedding Service initialized');
  }

  /**
   * Generate embedding for a build configuration
   * PHASE 2 ERROR FIX #3: Added circuit breaker and enhanced error handling
   * @param {Object} build - Build configuration object
   * @returns {Promise<Array>} - Embedding vector
   */
  async generateBuildEmbedding(build) {
    try {
      const cacheKey = this.hashBuild(build);
      
      // Check cache first
      if (this.embeddingCache.has(cacheKey)) {
        logger.debug('✅ Embedding cache hit');
        return this.embeddingCache.get(cacheKey);
      }
      
      // Create semantic description
      const description = this.buildToSemanticDescription(build);
      
      // PHASE 2 ERROR FIX #3: Use circuit breaker for Ollama calls
      const embedding = await aiCircuitBreaker.call(
        async () => {
          const response = await axios.post(
            `${this.ollamaUrl}/api/embeddings`,
            {
              model: this.model,
              prompt: description
            },
            { 
              timeout: 10000,
              validateStatus: (status) => status === 200 // Only accept 200 status
            }
          );
          
          if (!response.data || !response.data.embedding) {
            throw new Error('Invalid embedding response from Ollama');
          }
          
          return response.data.embedding;
        },
        {
          fallbackValue: null, // Return null on circuit breaker failure
          metadata: {
            operation: 'embedding-generation',
            model: this.model,
            descriptionLength: description.length
          }
        }
      );
      
      if (!embedding) {
        logger.warn('⚠️ Circuit breaker returned null for embedding generation');
        return null;
      }
      
      // Cache the embedding
      this.cacheEmbedding(cacheKey, embedding);
      
      logger.debug('🧠 Generated build embedding', {
        dimensions: embedding.length,
        cached: true,
        cacheSize: this.embeddingCache.size
      });
      
      return embedding;
      
    } catch (error) {
      logger.error('❌ Failed to generate embedding', { 
        error: error.message,
        model: this.model,
        stack: error.stack,
        circuitBreakerState: aiCircuitBreaker.getStatus().state
      });
      
      // Return null to handle gracefully
      return null;
    }
  }

  /**
   * Convert build to semantic description for embedding
   */
  buildToSemanticDescription(build, useCase = null, priceRange = null) {
    const parts = {
      cpu: build.cpu || build.CPU,
      gpu: build.gpu || build.GPU,
      motherboard: build.motherboard || build.Motherboard,
      ram: build.ram || build.RAM,
      storage: build.storage || build.Storage,
      psu: build.psu || build.PSU,
      case: build.case || build.Case,
      cooler: build.cooler || build.Cooler
    };
    
    // Determine use case from parameters or build properties
    const effectiveUseCase = useCase || build.useCase || build.primary_use || 'General';
    const effectivePriceRange = priceRange || build.priceRange || build.budget_tier || 'mid-range';
    
    return `
PC Build Configuration:
CPU: ${parts.cpu?.name || 'Not specified'} with ${parts.cpu?.cores || 0} cores, ${parts.cpu?.threads || 0} threads, ${parts.cpu?.tdp || 0}W TDP, ${parts.cpu?.base_clock || 0} base clock
GPU: ${parts.gpu?.name || 'Not specified'} with ${parts.gpu?.vram || 0}GB VRAM, ${parts.gpu?.tdp || 0}W power draw, ${parts.gpu?.boost_clock || 0} boost clock
RAM: ${parts.ram?.capacity || 0}GB DDR${parts.ram?.generation || 4} at ${parts.ram?.speed || 0}MHz, ${parts.ram?.cas_latency || 'CL16'}
Storage: ${parts.storage?.capacity || 0}GB ${parts.storage?.type || 'HDD'}, ${parts.storage?.interface || 'SATA'}, ${parts.storage?.read_speed || 0} MB/s read
Motherboard: ${parts.motherboard?.chipset || 'Unknown'} chipset, ${parts.motherboard?.formFactor || 'ATX'}, ${parts.motherboard?.socket || 'Unknown'} socket
PSU: ${parts.psu?.wattage || 0}W ${parts.psu?.efficiency || '80+ Bronze'}, ${parts.psu?.modular || 'non-modular'}
Cooler: ${parts.cooler?.type || 'Unknown'} cooling, ${parts.cooler?.tdp_rating || 0}W TDP rating
Case: ${parts.case?.form_factor || 'ATX'} form factor, ${parts.case?.gpu_clearance || 0}mm GPU clearance
Use Case: ${effectiveUseCase}
Budget Range: ${effectivePriceRange}
Performance Tier: ${this.calculatePerformanceTier(build)}
Target Resolution: ${build.target_resolution || '1080p'}
Target Framerate: ${build.target_fps || '60fps'}
    `.trim();
  }

  /**
   * Calculate performance tier from build specs
   */
  calculatePerformanceTier(build) {
    const cpu = build.cpu || build.CPU || {};
    const gpu = build.gpu || build.GPU || {};
    
    const cpuScore = (cpu.cores || 0) * (parseFloat(cpu.base_clock) || 1);
    const gpuScore = (gpu.vram || 0) * 100;
    const totalScore = cpuScore + gpuScore;
    
    if (totalScore > 2000) return 'High-End / Enthusiast';
    if (totalScore > 1000) return 'Mid-Range / Performance';
    if (totalScore > 500) return 'Budget / Entry-Level';
    return 'Office / Basic';
  }

  /**
   * Find similar builds using vector similarity
   * @param {Object} targetBuild - Build to find similar matches for
   * @param {number} topK - Number of similar builds to return
   * @returns {Promise<Array>} - Similar builds with similarity scores
   */
  async findSimilarBuilds(targetBuild, topK = 5) {
    try {
      // Generate embedding for target build
      const targetEmbedding = await this.generateBuildEmbedding(targetBuild);
      
      if (!targetEmbedding) {
        logger.warn('⚠️ Could not generate target embedding - using fallback');
        return [];
      }
      
      // Get historical builds from database
      const historicalBuilds = await this.getHistoricalBuilds();
      
      if (historicalBuilds.length === 0) {
        logger.info('ℹ️ No historical builds found');
        return [];
      }
      
      logger.info(`🔍 Comparing against ${historicalBuilds.length} historical builds`);
      
      // Calculate similarity scores
      const similarities = await Promise.all(
        historicalBuilds.map(async (build) => {
          const embedding = await this.generateBuildEmbedding(build);
          
          if (!embedding) return null;
          
          const similarity = this.cosineSimilarity(targetEmbedding, embedding);
          
          return {
            build,
            similarity,
            outcome: build.outcome,
            userAccepted: build.userAccepted,
            adminOverride: build.adminOverride
          };
        })
      );
      
      // Filter out nulls and sort by similarity
      const validSimilarities = similarities
        .filter(s => s !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, topK);
      
      logger.info(`✅ Found ${validSimilarities.length} similar builds`, {
        topSimilarity: validSimilarities[0]?.similarity.toFixed(3)
      });
      
      return validSimilarities;
      
    } catch (error) {
      logger.error('❌ Error finding similar builds', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      logger.warn('⚠️ Vector length mismatch', {
        vecA: vecA.length,
        vecB: vecB.length
      });
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Get historical builds from compatibility_logs
   */
  async getHistoricalBuilds() {
    try {
      const result = await db.query(
        `SELECT 
          parts_json,
          user_decision,
          admin_override,
          admin_override_reason,
          outcome_quality,
          created_at
         FROM compatibility_logs
         WHERE outcome_quality IS NOT NULL
           AND created_at > NOW() - INTERVAL '6 months'
         ORDER BY created_at DESC
         LIMIT 500`,
        []
      );
      
      return result.rows.map(row => {
        // FIX: PostgreSQL JSON columns return objects, not strings - no need to parse
        const parts = typeof row.parts_json === 'string' 
          ? JSON.parse(row.parts_json) 
          : row.parts_json;
        
        return {
          ...parts,
          outcome: row.outcome_quality,
          userAccepted: row.user_decision === 'accepted',
          adminOverride: row.admin_override,
          adminReason: row.admin_override_reason,
          date: row.created_at
        };
      });
      
    } catch (error) {
      logger.error('❌ Error fetching historical builds', { error: error.message });
      return [];
    }
  }

  /**
   * Enrich AI prompt with similar builds context
   */
  enrichPromptWithSimilarBuilds(basePrompt, similarBuilds) {
    if (!similarBuilds || similarBuilds.length === 0) {
      return basePrompt;
    }
    
    const contextAddition = `
<similar_historical_builds>
Based on semantic analysis of ${similarBuilds.length} similar configurations:

${similarBuilds.map((sb, idx) => `
${idx + 1}. Similarity: ${(sb.similarity * 100).toFixed(1)}%
   Configuration: ${this.summarizeBuild(sb.build)}
   Outcome: ${sb.outcome}
   ${sb.build.userAccepted ? '✅ User accepted' : '❌ User rejected'}
   ${sb.build.adminOverride ? `⚠️ Admin note: ${sb.build.adminReason}` : ''}
`).join('\n')}

Key patterns from similar builds:
${this.extractPatterns(similarBuilds)}
</similar_historical_builds>
`;
    
    return {
      ...basePrompt,
      context: (basePrompt.context || basePrompt.task) + '\n\n' + contextAddition
    };
  }

  /**
   * Summarize build for display
   */
  summarizeBuild(build) {
    const cpu = build.cpu || build.CPU;
    const gpu = build.gpu || build.GPU;
    const ram = build.ram || build.RAM;
    
    return `${cpu?.name || 'Unknown CPU'} + ${gpu?.name || 'Unknown GPU'} + ${ram?.capacity || 0}GB RAM`;
  }

  /**
   * Extract patterns from similar builds
   */
  extractPatterns(similarBuilds) {
    const successful = similarBuilds.filter(
      sb => sb.outcome === 'success' && sb.build.userAccepted
    );
    const problematic = similarBuilds.filter(
      sb => sb.outcome !== 'success' || !sb.build.userAccepted
    );
    
    const patterns = [];
    
    if (successful.length > 0) {
      patterns.push(
        `- ${successful.length}/${similarBuilds.length} similar builds were successful`
      );
      
      // Find common traits
      const commonPSU = this.findCommonTrait(successful, 'psu.wattage', 'PSU');
      if (commonPSU) {
        patterns.push(`- Successful builds typically used ${commonPSU}W PSU`);
      }
      
      const commonCooler = this.findCommonTrait(successful, 'cooler.type', 'Cooler');
      if (commonCooler) {
        patterns.push(`- Successful builds used ${commonCooler} cooling`);
      }
    }
    
    if (problematic.length > 0) {
      patterns.push(
        `- ${problematic.length}/${similarBuilds.length} similar builds had issues`
      );
      
      // Extract common issues from admin notes
      const issues = problematic
        .filter(pb => pb.build.adminReason)
        .map(pb => pb.build.adminReason);
      
      if (issues.length > 0) {
        const topIssue = issues[0];
        patterns.push(`- Common issue: ${topIssue}`);
      }
    }
    
    return patterns.length > 0 
      ? patterns.join('\n') 
      : '- No significant patterns detected';
  }

  /**
   * Find common trait across builds
   */
  findCommonTrait(builds, path, category) {
    const values = builds.map(b => {
      const keys = path.split('.');
      let val = b.build;
      
      // Try both lowercase and uppercase category names
      if (!val[keys[0]]) {
        val = val[category] || val[category.toUpperCase()];
      }
      
      for (const key of keys) {
        val = val?.[key];
      }
      
      return val;
    }).filter(Boolean);
    
    if (values.length === 0) return null;
    
    // Find mode (most common value)
    const freq = {};
    values.forEach(v => {
      freq[v] = (freq[v] || 0) + 1;
    });
    
    const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    
    // Return if more than 50% of builds have this value
    return mode && mode[1] > values.length / 2 ? mode[0] : null;
  }

  /**
   * Cache embedding with size limit
   */
  cacheEmbedding(key, embedding) {
    // Evict oldest if cache is full
    if (this.embeddingCache.size >= this.cacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      this.embeddingCache.delete(firstKey);
    }
    
    this.embeddingCache.set(key, embedding);
  }

  /**
   * Hash build for cache key
   */
  hashBuild(build) {
    try {
      return crypto
        .createHash('md5')
        .update(JSON.stringify(build))
        .digest('hex');
    } catch (error) {
      logger.error('❌ Error hashing build', { error: error.message });
      return Date.now().toString();
    }
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    const size = this.embeddingCache.size;
    this.embeddingCache.clear();
    logger.info(`🗑️ Cleared ${size} embeddings from cache`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.embeddingCache.size,
      maxSize: this.cacheSize,
      usage: ((this.embeddingCache.size / this.cacheSize) * 100).toFixed(2) + '%'
    };
  }
}

// Create singleton instance
const embeddingService = new EmbeddingService();

module.exports = embeddingService;
