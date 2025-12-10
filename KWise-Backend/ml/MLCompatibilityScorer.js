/**
 * K-WISE Machine Learning Compatibility Scorer
 * Custom lightweight ML implementation for compatibility prediction
 * No external ML libraries required - pure JavaScript
 * 
 * Uses:
 * - Pattern matching
 * - Weighted scoring based on rule analysis
 * - Statistical analysis of 2,513 compatibility rules
 * - Confidence scoring (0-100%)
 */

const { query } = require('../config/db');
const logger = require('../utils/logger');

class MLCompatibilityScorer {
  constructor() {
    this.rulePatterns = null;
    this.categoryWeights = null;
    this.ruleTypeWeights = {
      'requires': 1.0,
      'recommends': 0.7,
      'conflicts': -1.0,
      'incompatible': -1.0,
      'warning': 0.3
    };
    this.initialized = false;
    this.stats = {
      totalPredictions: 0,
      averageConfidence: 0,
      cacheHits: 0
    };
    this.predictionCache = new Map();
  }

  /**
   * Initialize ML scorer with database rules
   */
  async initialize() {
    if (this.initialized) return;

    try {
      logger.info('[ML] Initializing compatibility scorer...');

      // Load all compatibility rules
      const rulesResult = await query(`
        SELECT 
          component_a_category,
          component_b_category,
          rule_type,
          rule_category,
          severity,
          priority,
          enabled,
          rule_expression
        FROM compatibility_rules
        WHERE enabled = true
        ORDER BY priority DESC
      `);

      const rules = rulesResult.rows;
      logger.info(`[ML] Loaded ${rules.length} compatibility rules`);

      // Analyze patterns
      this.rulePatterns = this._analyzePatterns(rules);
      this.categoryWeights = this._calculateCategoryWeights(rules);

      this.initialized = true;
      logger.info('[ML] ML scorer initialized successfully');
      logger.info(`[ML] Patterns identified: ${Object.keys(this.rulePatterns).length}`);

    } catch (error) {
      logger.error('[ML] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns from compatibility rules
   */
  _analyzePatterns(rules) {
    const patterns = {};

    rules.forEach(rule => {
      const key = `${rule.component_a_category}_${rule.component_b_category}`;
      
      if (!patterns[key]) {
        patterns[key] = {
          totalRules: 0,
          requires: 0,
          recommends: 0,
          conflicts: 0,
          incompatible: 0,
          avgPriority: 0,
          expressions: []
        };
      }

      patterns[key].totalRules++;
      patterns[key][rule.rule_type]++;
      patterns[key].avgPriority += rule.priority || 5;
      
      if (rule.rule_expression) {
        patterns[key].expressions.push(rule.rule_expression);
      }
    });

    // Calculate averages
    Object.keys(patterns).forEach(key => {
      patterns[key].avgPriority /= patterns[key].totalRules;
      
      // Calculate compatibility score for this pattern
      const p = patterns[key];
      p.baseScore = (
        (p.requires * 1.0) +
        (p.recommends * 0.7) +
        (p.conflicts * -0.5) +
        (p.incompatible * -1.0)
      ) / p.totalRules;
    });

    return patterns;
  }

  /**
   * Calculate category-specific weights
   */
  _calculateCategoryWeights(rules) {
    const weights = {};
    const categories = new Set();

    rules.forEach(rule => {
      categories.add(rule.component_a_category);
      categories.add(rule.component_b_category);
    });

    // Initialize weights
    categories.forEach(cat => {
      weights[cat] = {
        criticalRules: 0,
        totalRules: 0,
        avgPriority: 0
      };
    });

    // Calculate weights based on rule frequency and severity
    rules.forEach(rule => {
      const catA = rule.component_a_category;
      const catB = rule.component_b_category;

      if (weights[catA]) {
        weights[catA].totalRules++;
        weights[catA].avgPriority += rule.priority || 5;
        if (rule.severity === 'error') weights[catA].criticalRules++;
      }

      if (weights[catB]) {
        weights[catB].totalRules++;
        weights[catB].avgPriority += rule.priority || 5;
        if (rule.severity === 'error') weights[catB].criticalRules++;
      }
    });

    // Normalize weights
    Object.keys(weights).forEach(cat => {
      if (weights[cat].totalRules > 0) {
        weights[cat].avgPriority /= weights[cat].totalRules;
        weights[cat].importance = 
          (weights[cat].criticalRules / weights[cat].totalRules) * 
          (weights[cat].avgPriority / 10);
      }
    });

    return weights;
  }

  /**
   * Predict compatibility score between two components
   * Returns score 0-100 and confidence level
   */
  async predict(componentA, componentB) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `${componentA.category}_${componentA.id}_${componentB.category}_${componentB.id}`;
    
    // Check cache
    if (this.predictionCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.predictionCache.get(cacheKey);
    }

    try {
      const prediction = this._calculateCompatibilityScore(componentA, componentB);
      
      // Update stats
      this.stats.totalPredictions++;
      this.stats.averageConfidence = 
        (this.stats.averageConfidence * (this.stats.totalPredictions - 1) + prediction.confidence) /
        this.stats.totalPredictions;

      // Cache result
      this.predictionCache.set(cacheKey, prediction);
      
      // Limit cache size
      if (this.predictionCache.size > 1000) {
        const firstKey = this.predictionCache.keys().next().value;
        this.predictionCache.delete(firstKey);
      }

      return prediction;

    } catch (error) {
      logger.error('[ML] Prediction error:', error);
      return {
        score: 50,
        confidence: 0,
        reason: 'Error during prediction',
        method: 'fallback'
      };
    }
  }

  /**
   * Calculate compatibility score using pattern analysis
   */
  _calculateCompatibilityScore(componentA, componentB) {
    const patternKey = `${componentA.category}_${componentB.category}`;
    const reverseKey = `${componentB.category}_${componentA.category}`;
    
    // Get pattern data
    const pattern = this.rulePatterns[patternKey] || this.rulePatterns[reverseKey];
    
    if (!pattern) {
      // No rules found - assume neutral compatibility
      return {
        score: 75, // Default neutral-positive score
        confidence: 30, // Low confidence
        reason: 'No specific compatibility rules found',
        method: 'default',
        patterns: null
      };
    }

    // Base score from pattern analysis
    let baseScore = (pattern.baseScore + 1) * 50; // Convert -1 to 1 range to 0-100

    // Adjust based on category importance
    const catAWeight = this.categoryWeights[componentA.category]?.importance || 0.5;
    const catBWeight = this.categoryWeights[componentB.category]?.importance || 0.5;
    const categoryFactor = (catAWeight + catBWeight) / 2;

    // Adjust score based on priority
    const priorityFactor = pattern.avgPriority / 10; // Normalize to 0-1
    
    // Calculate final score
    let finalScore = baseScore * (0.7 + priorityFactor * 0.3);

    // Ensure score is in 0-100 range
    finalScore = Math.max(0, Math.min(100, finalScore));

    // Calculate confidence based on number of rules
    let confidence = Math.min(95, 50 + (pattern.totalRules * 5));

    // Reduce confidence if conflicting rules exist
    if (pattern.conflicts > 0 || pattern.incompatible > 0) {
      const negativeRatio = (pattern.conflicts + pattern.incompatible) / pattern.totalRules;
      confidence *= (1 - negativeRatio * 0.3);
    }

    // Determine compatibility level
    let level, reason;
    if (finalScore >= 90) {
      level = 'excellent';
      reason = 'Highly compatible based on compatibility rules';
    } else if (finalScore >= 75) {
      level = 'good';
      reason = 'Compatible with minor considerations';
    } else if (finalScore >= 60) {
      level = 'fair';
      reason = 'Partially compatible, check specifications';
    } else if (finalScore >= 40) {
      level = 'poor';
      reason = 'Limited compatibility, potential issues';
    } else {
      level = 'incompatible';
      reason = 'Not recommended based on compatibility rules';
    }

    return {
      score: Math.round(finalScore),
      confidence: Math.round(confidence),
      level,
      reason,
      method: 'ml_pattern_analysis',
      patterns: {
        totalRules: pattern.totalRules,
        requires: pattern.requires,
        recommends: pattern.recommends,
        conflicts: pattern.conflicts,
        incompatible: pattern.incompatible,
        avgPriority: pattern.avgPriority.toFixed(2)
      },
      categoryWeights: {
        [componentA.category]: catAWeight.toFixed(3),
        [componentB.category]: catBWeight.toFixed(3)
      }
    };
  }

  /**
   * Get ML scorer statistics
   */
  getStats() {
    return {
      initialized: this.initialized,
      totalPatterns: this.rulePatterns ? Object.keys(this.rulePatterns).length : 0,
      totalCategories: this.categoryWeights ? Object.keys(this.categoryWeights).length : 0,
      predictions: this.stats.totalPredictions,
      averageConfidence: Math.round(this.stats.averageConfidence),
      cacheSize: this.predictionCache.size,
      cacheHits: this.stats.cacheHits,
      cacheHitRate: this.stats.totalPredictions > 0
        ? ((this.stats.cacheHits / this.stats.totalPredictions) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Clear prediction cache
   */
  clearCache() {
    this.predictionCache.clear();
    logger.info('[ML] Prediction cache cleared');
  }

  /**
   * Reinitialize with fresh data
   */
  async reinitialize() {
    this.initialized = false;
    this.rulePatterns = null;
    this.categoryWeights = null;
    this.clearCache();
    await this.initialize();
    logger.info('[ML] ML scorer reinitialized');
  }
}

// Singleton instance
const mlScorer = new MLCompatibilityScorer();

module.exports = mlScorer;
