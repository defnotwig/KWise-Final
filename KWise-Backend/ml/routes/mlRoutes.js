/**
 * Machine Learning API Routes
 * Provides ML-based compatibility scoring endpoints
 * 
 * Endpoints:
 * - POST /api/ml/predict - Get ML compatibility score
 * - GET /api/ml/stats - ML scorer statistics
 * - POST /api/ml/reinitialize - Reload ML patterns
 * - POST /api/ml/clear-cache - Clear prediction cache
 */

const express = require('express');
const router = express.Router();
const mlScorer = require('../MLCompatibilityScorer');
const logger = require('../../utils/logger');

/**
 * POST /api/ml/predict
 * Predict compatibility score between two components
 * 
 * Body:
 * {
 *   componentA: { id, name, category, ... },
 *   componentB: { id, name, category, ... }
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     score: 85,              // 0-100
 *     confidence: 92,         // 0-100
 *     level: 'excellent',     // excellent/good/fair/poor/incompatible
 *     reason: '...',
 *     method: 'ml_pattern_analysis',
 *     patterns: { ... },
 *     categoryWeights: { ... }
 *   }
 * }
 */
router.post('/predict', async (req, res) => {
  try {
    const { componentA, componentB } = req.body;

    // Validate inputs
    if (!componentA || !componentB) {
      return res.status(400).json({
        success: false,
        message: 'Both componentA and componentB are required'
      });
    }

    if (!componentA.category || !componentB.category) {
      return res.status(400).json({
        success: false,
        message: 'Component categories are required'
      });
    }

    // Get ML prediction
    const prediction = await mlScorer.predict(componentA, componentB);

    logger.info(`[ML API] Prediction: ${componentA.category} + ${componentB.category} = ${prediction.score}% (confidence: ${prediction.confidence}%)`);

    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[ML API] Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate ML prediction',
      error: error.message
    });
  }
});

/**
 * GET /api/ml/stats
 * Get ML scorer statistics and performance metrics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = mlScorer.getStats();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[ML API] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve ML stats',
      error: error.message
    });
  }
});

/**
 * POST /api/ml/reinitialize
 * Reinitialize ML scorer with fresh database rules
 * Useful after adding new compatibility rules
 */
router.post('/reinitialize', async (req, res) => {
  try {
    await mlScorer.reinitialize();

    const stats = mlScorer.getStats();

    logger.info('[ML API] ML scorer reinitialized');

    res.json({
      success: true,
      message: 'ML scorer reinitialized successfully',
      data: stats
    });

  } catch (error) {
    logger.error('[ML API] Reinitialize error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reinitialize ML scorer',
      error: error.message
    });
  }
});

/**
 * POST /api/ml/clear-cache
 * Clear prediction cache
 */
router.post('/clear-cache', (req, res) => {
  try {
    mlScorer.clearCache();

    logger.info('[ML API] Prediction cache cleared');

    res.json({
      success: true,
      message: 'Prediction cache cleared successfully'
    });

  } catch (error) {
    logger.error('[ML API] Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear prediction cache',
      error: error.message
    });
  }
});

/**
 * POST /api/ml/batch-predict
 * Batch prediction for multiple component pairs
 * Useful for analyzing entire builds
 * 
 * Body:
 * {
 *   pairs: [
 *     { componentA: {...}, componentB: {...} },
 *     { componentA: {...}, componentB: {...} },
 *     ...
 *   ]
 * }
 */
router.post('/batch-predict', async (req, res) => {
  try {
    const { pairs } = req.body;

    if (!Array.isArray(pairs) || pairs.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Array of component pairs is required'
      });
    }

    if (pairs.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 pairs per batch request'
      });
    }

    // Process all pairs
    const predictions = await Promise.all(
      pairs.map(async (pair, index) => {
        try {
          const prediction = await mlScorer.predict(pair.componentA, pair.componentB);
          return {
            index,
            componentA: pair.componentA.category,
            componentB: pair.componentB.category,
            prediction
          };
        } catch (error) {
          return {
            index,
            componentA: pair.componentA?.category || 'unknown',
            componentB: pair.componentB?.category || 'unknown',
            error: error.message
          };
        }
      })
    );

    // Calculate overall compatibility score
    const validPredictions = predictions.filter(p => !p.error);
    const averageScore = validPredictions.length > 0
      ? validPredictions.reduce((sum, p) => sum + p.prediction.score, 0) / validPredictions.length
      : 0;

    const averageConfidence = validPredictions.length > 0
      ? validPredictions.reduce((sum, p) => sum + p.prediction.confidence, 0) / validPredictions.length
      : 0;

    logger.info(`[ML API] Batch prediction: ${pairs.length} pairs, avg score: ${averageScore.toFixed(2)}%`);

    res.json({
      success: true,
      data: {
        predictions,
        summary: {
          totalPairs: pairs.length,
          successful: validPredictions.length,
          failed: predictions.length - validPredictions.length,
          averageScore: Math.round(averageScore),
          averageConfidence: Math.round(averageConfidence)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[ML API] Batch prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch predictions',
      error: error.message
    });
  }
});

module.exports = router;
