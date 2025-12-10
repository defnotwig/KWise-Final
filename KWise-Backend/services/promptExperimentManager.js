/**
 * Prompt Experiment Manager - A/B Testing Framework for AI Prompts
 * Tests different prompt variations to measure effectiveness
 * Automatically determines winning strategies
 * 
 * @module PromptExperimentManager
 * @author K-Wise AI Integration Team
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const db = require('../config/db');
const crypto = require('crypto');

class PromptExperimentManager {
  constructor() {
    this.experiments = new Map();
    this.activeExperiments = [];
    
    logger.info('🧪 Prompt Experiment Manager initialized');
  }

  /**
   * Create a new A/B test experiment
   * @param {string} experimentId - Unique experiment identifier
   * @param {Object} config - Experiment configuration
   */
  async createExperiment(experimentId, config) {
    try {
      // Validate config
      if (!config.name || !config.variants || config.variants.length < 2) {
        throw new Error('Invalid experiment config: need name and at least 2 variants');
      }
      
      const experiment = {
        id: experimentId,
        name: config.name,
        description: config.description || '',
        variants: config.variants,
        allocation: config.allocation || 'equal',
        startDate: Date.now(),
        endDate: config.duration ? Date.now() + config.duration : null,
        targetScenario: config.scenario || 'compatibility',
        metrics: {
          byVariant: {}
        }
      };
      
      // Initialize metrics for each variant
      config.variants.forEach(variant => {
        experiment.metrics.byVariant[variant.id] = {
          impressions: 0,
          conversions: 0,
          totalConfidence: 0,
          avgConfidence: 0,
          totalLatency: 0,
          avgLatency: 0,
          feedbackScore: 0,
          feedbackCount: 0,
          errors: 0
        };
      });
      
      // Store in memory
      this.experiments.set(experimentId, experiment);
      this.activeExperiments.push(experimentId);
      
      // Persist to database
      await db.query(
        `INSERT INTO ai_experiment_variants (
          experiment_id,
          variant_id,
          variant_name,
          variant_config,
          status,
          created_at
        ) VALUES ${config.variants.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, 'active', NOW())`).join(', ')}`,
        [
          experimentId,
          ...config.variants.flatMap(v => [v.id, v.name, JSON.stringify(v)])
        ]
      );
      
      logger.info('✅ Experiment created', {
        id: experimentId,
        name: config.name,
        variants: config.variants.length,
        duration: config.duration ? `${config.duration / 1000 / 60 / 60 / 24} days` : 'unlimited'
      });
      
      return experiment;
      
    } catch (error) {
      logger.error('❌ Error creating experiment', { 
        experimentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Select variant for a user (consistent assignment)
   * @param {string} experimentId - Experiment ID
   * @param {string} userId - User ID (for consistent assignment)
   * @returns {Object|null} - Selected variant or null if experiment inactive
   */
  selectVariant(experimentId, userId) {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      logger.warn('⚠️ Experiment not found', { experimentId });
      return null;
    }
    
    // Check if experiment is still active
    if (experiment.endDate && Date.now() > experiment.endDate) {
      logger.info('ℹ️ Experiment expired', { experimentId });
      return null;
    }
    
    // Hash-based assignment for consistency (same user always gets same variant)
    const userHash = crypto
      .createHash('md5')
      .update(userId || 'anonymous')
      .digest('hex');
    
    const hashInt = parseInt(userHash.substring(0, 8), 16);
    const variantIndex = hashInt % experiment.variants.length;
    
    const variant = experiment.variants[variantIndex];
    
    // Track impression
    experiment.metrics.byVariant[variant.id].impressions++;
    
    logger.info('🎲 Variant selected', {
      experiment: experimentId,
      variant: variant.id,
      userId: userId || 'anonymous'
    });
    
    return variant;
  }

  /**
   * Record outcome for a variant
   * @param {string} experimentId - Experiment ID
   * @param {string} variantId - Variant ID
   * @param {Object} outcome - Outcome data
   */
  recordOutcome(experimentId, variantId, outcome) {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) return;
    
    const metrics = experiment.metrics.byVariant[variantId];
    
    if (!metrics) {
      logger.warn('⚠️ Variant not found', { experimentId, variantId });
      return;
    }
    
    // Update metrics
    if (outcome.conversion) {
      metrics.conversions++;
    }
    
    if (outcome.confidence !== undefined) {
      metrics.totalConfidence += outcome.confidence;
      metrics.avgConfidence = metrics.totalConfidence / metrics.impressions;
    }
    
    if (outcome.latency !== undefined) {
      metrics.totalLatency += outcome.latency;
      metrics.avgLatency = metrics.totalLatency / metrics.impressions;
    }
    
    if (outcome.feedbackScore !== undefined) {
      metrics.feedbackScore = 
        (metrics.feedbackScore * metrics.feedbackCount + outcome.feedbackScore) / 
        (metrics.feedbackCount + 1);
      metrics.feedbackCount++;
    }
    
    if (outcome.error) {
      metrics.errors++;
    }
    
    logger.info('📊 Outcome recorded', {
      experiment: experimentId,
      variant: variantId,
      impressions: metrics.impressions,
      conversions: metrics.conversions
    });
  }

  /**
   * Analyze experiment results
   * @param {string} experimentId - Experiment ID
   * @returns {Object} - Analysis results with winner
   */
  analyzeExperiment(experimentId) {
    const experiment = this.experiments.get(experimentId);
    
    if (!experiment) {
      logger.warn('⚠️ Experiment not found', { experimentId });
      return null;
    }
    
    const results = Object.entries(experiment.metrics.byVariant).map(([variantId, metrics]) => {
      const variant = experiment.variants.find(v => v.id === variantId);
      
      const conversionRate = metrics.impressions > 0 
        ? (metrics.conversions / metrics.impressions * 100).toFixed(2)
        : '0.00';
      
      const errorRate = metrics.impressions > 0
        ? (metrics.errors / metrics.impressions * 100).toFixed(2)
        : '0.00';
      
      const compositeScore = this.calculateCompositeScore(metrics);
      
      return {
        variantId,
        variantName: variant.name,
        impressions: metrics.impressions,
        conversions: metrics.conversions,
        conversionRate: conversionRate + '%',
        avgConfidence: metrics.avgConfidence.toFixed(2),
        avgLatency: Math.round(metrics.avgLatency),
        feedbackScore: metrics.feedbackScore.toFixed(2),
        errorRate: errorRate + '%',
        compositeScore: compositeScore.toFixed(2)
      };
    });
    
    // Determine winner (highest composite score)
    const winner = results.reduce((best, current) => 
      parseFloat(current.compositeScore) > parseFloat(best.compositeScore) ? current : best
    );
    
    // Calculate statistical significance
    const significance = this.calculateSignificance(results);
    
    const analysis = {
      experimentId,
      experimentName: experiment.name,
      status: experiment.endDate && Date.now() > experiment.endDate ? 'completed' : 'active',
      startDate: new Date(experiment.startDate).toISOString(),
      endDate: experiment.endDate ? new Date(experiment.endDate).toISOString() : 'ongoing',
      totalImpressions: results.reduce((sum, r) => sum + r.impressions, 0),
      results,
      winner,
      significance,
      recommendation: this.generateRecommendation(results, winner, significance)
    };
    
    logger.info('📈 Experiment analyzed', {
      id: experimentId,
      winner: winner.variantName,
      significance: significance.significant ? 'YES' : 'NO'
    });
    
    return analysis;
  }

  /**
   * Calculate composite score (weighted)
   * 40% conversion, 25% confidence, 20% feedback, 15% latency
   */
  calculateCompositeScore(metrics) {
    if (metrics.impressions === 0) return 0;
    
    const conversionScore = (metrics.conversions / metrics.impressions) * 100;
    const confidenceScore = metrics.avgConfidence;
    const feedbackScore = metrics.feedbackScore * 10; // Scale 0-10 to 0-100
    const latencyScore = Math.max(0, 100 - (metrics.avgLatency / 100)); // Lower is better
    const errorPenalty = (metrics.errors / metrics.impressions) * 50; // Errors reduce score
    
    return (
      conversionScore * 0.40 +
      confidenceScore * 0.25 +
      feedbackScore * 0.20 +
      latencyScore * 0.15 -
      errorPenalty
    );
  }

  /**
   * Calculate statistical significance (simplified chi-square test)
   */
  calculateSignificance(results) {
    if (results.length < 2) {
      return { significant: false, reason: 'Need at least 2 variants' };
    }
    
    // Get total impressions
    const totalImpressions = results.reduce((sum, r) => sum + r.impressions, 0);
    
    if (totalImpressions < 100) {
      return { 
        significant: false, 
        reason: 'Insufficient data (need 100+ impressions)',
        impressions: totalImpressions
      };
    }
    
    // Compare top 2 variants
    const sorted = results.sort((a, b) => 
      parseFloat(b.compositeScore) - parseFloat(a.compositeScore)
    );
    
    const winner = sorted[0];
    const runnerUp = sorted[1];
    
    const scoreDiff = parseFloat(winner.compositeScore) - parseFloat(runnerUp.compositeScore);
    const scoreDiffPercent = (scoreDiff / parseFloat(runnerUp.compositeScore)) * 100;
    
    // Consider significant if:
    // 1. Score difference > 10%
    // 2. Winner has at least 50 impressions
    // 3. Error rate difference favors winner
    
    const significant = 
      scoreDiffPercent > 10 &&
      winner.impressions >= 50 &&
      parseFloat(winner.errorRate) <= parseFloat(runnerUp.errorRate);
    
    return {
      significant,
      scoreDifference: scoreDiff.toFixed(2),
      scoreDifferencePercent: scoreDiffPercent.toFixed(2) + '%',
      winnerImpressions: winner.impressions,
      runnerUpImpressions: runnerUp.impressions
    };
  }

  /**
   * Generate recommendation based on analysis
   */
  generateRecommendation(results, winner, significance) {
    if (!significance.significant) {
      return `Inconclusive: ${significance.reason || 'No significant difference between variants'}. Continue testing or redesign experiment.`;
    }
    
    const scoreDiff = significance.scoreDifferencePercent;
    const improvement = parseFloat(scoreDiff.replace('%', ''));
    
    if (improvement > 20) {
      return `🏆 Strong winner: ${winner.variantName} shows ${scoreDiff} improvement. Strongly recommend adopting this prompt variation.`;
    } else if (improvement > 10) {
      return `✅ Moderate winner: ${winner.variantName} shows ${scoreDiff} improvement. Recommend adopting with continued monitoring.`;
    } else {
      return `⚠️ Marginal winner: ${winner.variantName} shows ${scoreDiff} improvement. Consider further validation before full adoption.`;
    }
  }

  /**
   * End an experiment
   */
  async endExperiment(experimentId) {
    try {
      const experiment = this.experiments.get(experimentId);
      
      if (!experiment) {
        throw new Error('Experiment not found');
      }
      
      // Mark as ended
      experiment.endDate = Date.now();
      
      // Remove from active list
      this.activeExperiments = this.activeExperiments.filter(id => id !== experimentId);
      
      // Update database
      await db.query(
        `UPDATE ai_experiment_variants 
         SET status = 'completed', updated_at = NOW()
         WHERE experiment_id = $1`,
        [experimentId]
      );
      
      // Generate final analysis
      const analysis = this.analyzeExperiment(experimentId);
      
      logger.info('🏁 Experiment ended', {
        id: experimentId,
        winner: analysis.winner.variantName,
        totalImpressions: analysis.totalImpressions
      });
      
      return analysis;
      
    } catch (error) {
      logger.error('❌ Error ending experiment', { 
        experimentId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get all active experiments
   */
  getActiveExperiments() {
    return this.activeExperiments.map(id => {
      const exp = this.experiments.get(id);
      return {
        id: exp.id,
        name: exp.name,
        variants: exp.variants.length,
        totalImpressions: Object.values(exp.metrics.byVariant)
          .reduce((sum, m) => sum + m.impressions, 0),
        startDate: new Date(exp.startDate).toISOString(),
        endDate: exp.endDate ? new Date(exp.endDate).toISOString() : 'ongoing'
      };
    });
  }

  /**
   * Get experiment details
   */
  getExperiment(experimentId) {
    return this.experiments.get(experimentId);
  }

  /**
   * Delete an experiment
   */
  async deleteExperiment(experimentId) {
    try {
      // Remove from memory
      this.experiments.delete(experimentId);
      this.activeExperiments = this.activeExperiments.filter(id => id !== experimentId);
      
      // Remove from database
      await db.query(
        `DELETE FROM ai_experiment_variants WHERE experiment_id = $1`,
        [experimentId]
      );
      
      logger.info('🗑️ Experiment deleted', { id: experimentId });
      
    } catch (error) {
      logger.error('❌ Error deleting experiment', { 
        experimentId, 
        error: error.message 
      });
      throw error;
    }
  }
}

// Create singleton instance
const promptExperimentManager = new PromptExperimentManager();

module.exports = promptExperimentManager;
