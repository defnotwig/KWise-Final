/**
 * AI Metrics & Management API Routes
 * PHASE 4 & 5: Admin endpoints for AI monitoring and control
 * Routes:
 *   - GET /api/ai-metrics/summary - Real-time AI metrics
 *   - GET /api/ai-metrics/historical - 7-day historical metrics
 *   - POST /api/ai-metrics/feedback - Submit admin feedback
 *   - POST /api/ai-metrics/precompute - Trigger precomputation
 *   - GET /api/ai-metrics/health - Circuit breaker and system health
 *   - GET /api/ai-metrics/experiments - List active A/B experiments
 *   - POST /api/ai-metrics/experiments - Create new experiment
 *   - GET /api/ai-metrics/experiments/:id/analyze - Analyze experiment results
 *   - POST /api/ai-metrics/experiments/:id/end - End experiment
 */

const express = require('express');
const router = express.Router();
const aiLogger = require('../services/aiLogger');
const feedbackProcessor = require('../services/feedbackProcessor');
const promptExperimentManager = require('../services/promptExperimentManager');
const aiCircuitBreaker = require('../services/aiCircuitBreaker');
const embeddingService = require('../services/embeddingService');
const { protect, restrictTo } = require('../middleware/auth');
const logger = require('../utils/logger');

// Helper function to get precompute manager (initialized in server.js)
function getPrecomputeManager() {
  return global.precomputeManager || null;
}

// Protect all AI metrics endpoints - admin+ only
router.use(protect);
router.use(restrictTo('superadmin', 'admin'));

/**
 * GET /api/ai-metrics/summary
 * Get real-time AI performance metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const metrics = aiLogger.getMetricsSummary();
    const precomputeManager = getPrecomputeManager();
    const precomputeStats = precomputeManager ? precomputeManager.getStats() : { status: 'not_initialized' };
    const feedbackStats = feedbackProcessor.getStats();
    const cacheStats = embeddingService.getCacheStats();
    const circuitState = aiCircuitBreaker.getState();

    res.json({
      success: true,
      data: {
        ai_performance: metrics,
        precompute: precomputeStats,
        feedback: feedbackStats,
        embedding_cache: cacheStats,
        circuit_breaker: circuitState
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get AI metrics summary', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve AI metrics',
      error: error.message
    });
  }
});

/**
 * GET /api/ai-metrics/historical
 * Get historical AI metrics from database
 * Query params: days (default: 7)
 */
router.get('/historical', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    
    if (days < 1 || days > 90) {
      return res.status(400).json({
        success: false,
        message: 'Days parameter must be between 1 and 90'
      });
    }

    const historicalMetrics = await aiLogger.getHistoricalMetrics(days);

    res.json({
      success: true,
      data: historicalMetrics,
      days,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get historical AI metrics', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve historical metrics',
      error: error.message
    });
  }
});

/**
 * POST /api/ai-metrics/feedback
 * Submit admin feedback for AI recommendation
 * Body: { recommendation_id, rating, issues, notes }
 */
router.post('/feedback', async (req, res) => {
  try {
    const { recommendation_id, rating, issues, notes } = req.body;

    if (!recommendation_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'recommendation_id and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const feedback = {
      rating,
      issues: issues || [],
      notes: notes || '',
      admin_id: req.user.id,
      admin_username: req.user.username
    };

    await feedbackProcessor.processFeedback(recommendation_id, feedback);

    // Also log to aiLogger for immediate tracking
    await aiLogger.logAdminFeedback(recommendation_id, feedback);

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      recommendation_id
    });
  } catch (error) {
    logger.error('❌ Failed to submit AI feedback', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to record feedback',
      error: error.message
    });
  }
});

/**
 * POST /api/ai-metrics/precompute
 * Manually trigger precomputation of popular builds
 * Body: { limit } (optional, default: 20)
 */
router.post('/precompute', async (req, res) => {
  try {
    const precomputeManager = getPrecomputeManager();
    
    if (!precomputeManager) {
      return res.status(503).json({
        success: false,
        message: 'Precompute manager not initialized'
      });
    }
    
    const limit = parseInt(req.body.limit) || 20;

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be between 1 and 100'
      });
    }

    // Start precomputation in background
    precomputeManager.precomputePopular(limit);

    const stats = precomputeManager.getStats();

    res.json({
      success: true,
      message: `Precomputation started for top ${limit} combinations`,
      stats
    });
  } catch (error) {
    logger.error('❌ Failed to trigger precompute', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to start precomputation',
      error: error.message
    });
  }
});

/**
 * GET /api/ai-metrics/health
 * Get AI system health status
 */
router.get('/health', async (req, res) => {
  try {
    const circuitState = aiCircuitBreaker.getState();
    const metrics = aiLogger.getMetricsSummary();
    
    const health = {
      status: 'healthy',
      circuit_breaker: circuitState.state,
      success_rate: metrics.successRate,
      avg_latency: metrics.avgLatency,
      fallback_rate: metrics.fallbackRate,
      cache_hit_rate: metrics.cacheHitRate,
      issues: []
    };

    // Determine overall health
    if (circuitState.state === 'OPEN') {
      health.status = 'degraded';
      health.issues.push('Circuit breaker is OPEN - AI calls are being rejected');
    }

    if (metrics.successRate < 90) {
      health.status = health.status === 'healthy' ? 'warning' : 'critical';
      health.issues.push(`Low success rate: ${metrics.successRate.toFixed(1)}%`);
    }

    if (metrics.avgLatency > 20000) {
      health.status = health.status === 'healthy' ? 'warning' : health.status;
      health.issues.push(`High average latency: ${(metrics.avgLatency / 1000).toFixed(1)}s`);
    }

    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to check AI health', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to check system health',
      error: error.message
    });
  }
});

/**
 * GET /api/ai-metrics/experiments
 * List all active A/B experiments
 */
router.get('/experiments', async (req, res) => {
  try {
    const experiments = await promptExperimentManager.getActiveExperiments();

    res.json({
      success: true,
      data: experiments,
      count: experiments.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get experiments', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve experiments',
      error: error.message
    });
  }
});

/**
 * POST /api/ai-metrics/experiments
 * Create new A/B experiment
 * Body: { experiment_id, name, variants: [{ variant_id, name, prompt_template }], duration_days }
 */
router.post('/experiments', async (req, res) => {
  try {
    const { experiment_id, name, variants, duration_days } = req.body;

    if (!experiment_id || !name || !variants || variants.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'experiment_id, name, and at least 2 variants are required'
      });
    }

    const config = {
      name,
      variants,
      duration: duration_days || 30
    };

    await promptExperimentManager.createExperiment(experiment_id, config);

    res.json({
      success: true,
      message: 'Experiment created successfully',
      experiment_id,
      variants: variants.length,
      duration_days: config.duration
    });
  } catch (error) {
    logger.error('❌ Failed to create experiment', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create experiment',
      error: error.message
    });
  }
});

/**
 * GET /api/ai-metrics/experiments/:id/analyze
 * Analyze experiment results and get recommendation
 */
router.get('/experiments/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    const analysis = await promptExperimentManager.analyzeExperiment(id);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      data: analysis,
      experiment_id: id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to analyze experiment', { error: error.message, experiment_id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to analyze experiment',
      error: error.message
    });
  }
});

/**
 * POST /api/ai-metrics/experiments/:id/end
 * End an active experiment
 */
router.post('/experiments/:id/end', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await promptExperimentManager.endExperiment(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      message: 'Experiment ended successfully',
      data: result,
      experiment_id: id
    });
  } catch (error) {
    logger.error('❌ Failed to end experiment', { error: error.message, experiment_id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to end experiment',
      error: error.message
    });
  }
});

module.exports = router;
