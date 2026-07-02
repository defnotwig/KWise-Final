/**
 * Precompute Manager - Background Caching for Popular Build Combinations
 * Analyzes compatibility_logs to identify popular builds and pre-computes AI analysis
 * 
 * @module PrecomputeManager
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const db = require('../config/db');

class PrecomputeManager {
  constructor(aiService, compatibilityService) {
    this.aiService = aiService;
    this.compatibilityService = compatibilityService;
    this.queue = [];
    this.processing = false;
    this.maxQueueSize = 20;
    this.stats = {
      totalPrecomputed: 0,
      successfulPrecomputes: 0,
      failedPrecomputes: 0,
      lastRun: null
    };
    
    logger.info('🔄 Precompute Manager initialized');
  }

  /**
   * Triggered when inventory updates (new parts added or prices change)
   * @param {Array} updatedParts - Array of part IDs that were updated
   */
  async onInventoryUpdate(updatedParts) {
    try {
      logger.info(`🔍 Precomputing AI insights for ${updatedParts.length} updated parts`);
      
      // Get popular build combinations from last 30 days
      const popularCombos = await this.getPopularCombinations(updatedParts);
      
      if (popularCombos.length === 0) {
        logger.info('ℹ️ No popular combinations found for precomputation');
        return;
      }
      
      logger.info(`📊 Found ${popularCombos.length} popular combinations to precompute`);
      
      // Queue precomputation jobs
      popularCombos.forEach(combo => {
        this.queue.push({
          parts: combo.parts,
          scenario: 'compatibility',
          priority: combo.frequency, // Process most popular first
          userContext: combo.context
        });
      });
      
      // Sort queue by priority (highest first)
      this.queue.sort((a, b) => b.priority - a.priority);

      if (this.queue.length > this.maxQueueSize) {
        this.queue = this.queue.slice(0, this.maxQueueSize);
        logger.warn(`⚠️ Precompute queue capped at ${this.maxQueueSize} items to avoid stale backlog`);
      }
      
      // Process queue in background
      if (!this.processing) {
        this.processQueue();
      }
      
    } catch (error) {
      logger.error('❌ Error in onInventoryUpdate', { error: error.message });
    }
  }

  /**
   * Get popular part combinations from compatibility_logs
   * @param {Array} parts - Part IDs to filter by
   * @returns {Promise<Array>} - Popular combinations
   */
  async getPopularCombinations(parts) {
    try {
      const query = `
        SELECT 
          parts_json,
          user_context,
          COUNT(*) as frequency,
          MAX(created_at) as last_checked
        FROM compatibility_logs
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND outcome_quality IN ('success', 'unknown')
          AND (
            parts_json::jsonb ?| $1::text[]
            OR $2 = TRUE
          )
        GROUP BY parts_json, user_context
        HAVING COUNT(*) >= 3
        ORDER BY frequency DESC
        LIMIT 50
      `;
      
      const partIds = parts.map(p => (typeof p === 'object' ? p.id : p).toString());
      const includeAll = parts.length === 0;
      
      const result = await db.query(query, [partIds, includeAll]);
      
      return result.rows.map(row => ({
        parts: JSON.parse(row.parts_json),
        context: row.user_context ? JSON.parse(row.user_context) : {},
        frequency: Number(row.frequency),
        lastChecked: row.last_checked
      }));
      
    } catch (error) {
      logger.error('❌ Error getting popular combinations', { error: error.message });
      return [];
    }
  }

  /**
   * Process precomputation queue
   */
  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      logger.info('✅ Precomputation queue empty');
      return;
    }
    
    this.processing = true;
    
    // Process one job at a time to avoid overloading Ollama
    const job = this.queue.shift();
    
    try {
      logger.info(`🔄 Precomputing ${job.scenario} analysis`, {
        queueRemaining: this.queue.length,
        priority: job.priority
      });
      
      // Add precompute flag to context
      const context = {
        ...job.userContext,
        precompute: true,
        persona_cluster: job.userContext?.persona_cluster || 'general'
      };

      if (!job.parts || typeof job.parts !== 'object') {
        throw new Error('Precompute job is missing a valid parts payload');
      }
      
      // Run compatibility analysis through the AI service using the cached parts/context contract.
      const result = await this.aiService.analyzeCompatibility(job.parts, context);
      
      this.stats.successfulPrecomputes++;
      this.stats.totalPrecomputed++;
      
      logger.info(`✅ Precomputed ${job.scenario} analysis`, {
        confidence: result.confidence || 'unknown',
        source: result.source || 'fresh',
        queueRemaining: this.queue.length
      });
      
    } catch (error) {
      this.stats.failedPrecomputes++;
      this.stats.totalPrecomputed++;
      
      logger.error('❌ Precompute job failed', { 
        error: error.message,
        scenario: job.scenario
      });
    }
    
    this.stats.lastRun = new Date();
    
    // Wait 2 seconds between jobs to prevent Ollama overload
    setTimeout(() => this.processQueue(), 2000);
  }

  /**
   * Manually trigger precomputation for all popular combinations
   * @param {number} limit - Maximum number of combinations to precompute
   */
  async precomputePopular(limit = 20) {
    try {
      logger.info(`🚀 Starting manual precomputation (limit: ${limit})`);
      
      // Get top popular combinations (no part filter)
      const popularCombos = await this.getPopularCombinations([]);
      
      const combosToProcess = popularCombos.slice(0, limit);
      
      if (combosToProcess.length === 0) {
        logger.info('ℹ️ No popular combinations found');
        return { processed: 0, queued: 0 };
      }
      
      // Add to queue
      combosToProcess.forEach(combo => {
        this.queue.push({
          parts: combo.parts,
          scenario: 'compatibility',
          priority: combo.frequency,
          userContext: combo.context
        });
      });
      
      logger.info(`📊 Queued ${combosToProcess.length} combinations for precomputation`);
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
      
      return {
        processed: combosToProcess.length,
        queued: this.queue.length,
        totalPopular: popularCombos.length
      };
      
    } catch (error) {
      logger.error('❌ Error in precomputePopular', { error: error.message });
      throw error;
    }
  }

  /**
   * Get precomputation statistics
   */
  getStats() {
    const successRateNum = this.stats.totalPrecomputed > 0
      ? ((this.stats.successfulPrecomputes / this.stats.totalPrecomputed) * 100)
      : 0;
      
    return {
      ...this.stats,
      queueLength: this.queue.length,
      processing: this.processing,
      successRate: successRateNum,
      successRateFormatted: successRateNum.toFixed(2) + '%'
    };
  }

  /**
   * Clear precomputation queue
   */
  clearQueue() {
    const cleared = this.queue.length;
    this.queue = [];
    logger.info(`🗑️ Cleared ${cleared} jobs from precomputation queue`);
    return cleared;
  }

  /**
   * Stop precomputation processing
   */
  stop() {
    this.processing = false;
    logger.info('⏸️ Precomputation processing stopped');
  }

  /**
   * Resume precomputation processing
   */
  resume() {
    if (this.queue.length > 0 && !this.processing) {
      logger.info('▶️ Resuming precomputation processing');
      this.processQueue();
    }
  }
}

module.exports = PrecomputeManager;
