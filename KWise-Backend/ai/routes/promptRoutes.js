/**
 * Prompt Optimization Routes for K-Wise AI System
 * Provides endpoints for prompt statistics and optimization monitoring
 * 
 * PHASE 2.3: Prompt Optimization
 * - GET /api/prompts/stats: Token usage statistics
 * - GET /api/prompts/templates: Available prompt templates
 * - POST /api/prompts/estimate: Estimate tokens for custom prompt
 * 
 * @module PromptRoutes
 * @version 2.3.0
 */

const express = require('express');
const router = express.Router();
const promptTemplates = require('../services/promptTemplates');
const { authenticateToken, restrictTo } = require('../../middleware/auth'); // FIXED: Using restrictTo instead of requireRole
const logger = require('../../utils/logger');

/**
 * GET /api/prompts/stats
 * Get comprehensive token usage statistics
 * 
 * Returns:
 * - Per-operation token counts (baseline vs optimized)
 * - Token savings (absolute and percentage)
 * - Aggregate statistics
 * - Estimated cost savings
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.get('/stats', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    const stats = promptTemplates.getAllTokenStats();
    
    // Calculate estimated cost savings
    // Assuming ~₱0.10 per 1000 tokens (rough Ollama equivalent)
    const costPerThousandTokens = 0.10;
    const tokensSavedPerRequest = stats.aggregate.totalTokensSaved;
    
    // Estimate monthly savings (assuming 10,000 AI requests per month)
    const estimatedMonthlyRequests = 10000;
    const monthlyTokensSaved = tokensSavedPerRequest * estimatedMonthlyRequests;
    const monthlyCostSavings = (monthlyTokensSaved / 1000) * costPerThousandTokens;
    
    logger.info('📊 Prompt statistics requested', {
      userId: req.user.id,
      avgSavings: stats.aggregate.averageSavingsPercent
    });
    
    res.json({
      success: true,
      message: 'Prompt optimization statistics retrieved successfully',
      data: {
        ...stats,
        costSavings: {
          tokensPerRequest: tokensSavedPerRequest,
          monthlyTokensSaved: monthlyTokensSaved,
          monthlyCostSavings: `₱${monthlyCostSavings.toFixed(2)}`,
          annualCostSavings: `₱${(monthlyCostSavings * 12).toFixed(2)}`
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get prompt stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompt statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/prompts/templates
 * Get list of available prompt templates
 * 
 * Returns:
 * - Template names and descriptions
 * - System prompts
 * - Expected output formats
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.get('/templates', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    const templates = {
      systemPrompts: promptTemplates.SYSTEM_PROMPTS,
      outputFormats: promptTemplates.OUTPUT_FORMATS,
      availableOperations: Object.keys(promptTemplates.SYSTEM_PROMPTS)
    };
    
    logger.info('📋 Prompt templates requested', {
      userId: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Prompt templates retrieved successfully',
      data: templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get prompt templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve prompt templates',
      error: error.message
    });
  }
});

/**
 * POST /api/prompts/estimate
 * Estimate token count for a custom prompt
 * 
 * Body:
 * - operation: Operation type (compatibility, hotPicks, etc.)
 * - context: Context data for prompt generation
 * 
 * Returns:
 * - Estimated token count
 * - Token savings vs baseline
 * - Generated prompts (system + user)
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.post('/estimate', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    const { operation, context } = req.body;
    
    if (!operation) {
      return res.status(400).json({
        success: false,
        message: 'Operation type is required'
      });
    }
    
    const prompt = promptTemplates.getPrompt(operation, context || {});
    const stats = promptTemplates.getTokenStats(operation, context || {});
    
    logger.info('🔍 Token estimation requested', {
      userId: req.user.id,
      operation,
      estimatedTokens: stats.estimatedTokens
    });
    
    res.json({
      success: true,
      message: 'Token estimation completed',
      data: {
        prompt,
        stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to estimate tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to estimate tokens',
      error: error.message
    });
  }
});

/**
 * GET /api/prompts/health
 * Simple health check for prompt templates service
 * 
 * Returns:
 * - Service status
 * - Number of available templates
 * - Average token savings
 * 
 * Access: Public (no authentication required)
 */
router.get('/health', (req, res) => {
  try {
    const stats = promptTemplates.getAllTokenStats();
    const templateCount = Object.keys(promptTemplates.SYSTEM_PROMPTS).length;
    
    res.json({
      success: true,
      healthy: true,
      data: {
        templateCount,
        averageSavings: stats.aggregate.averageSavingsPercent,
        totalTokensSaved: stats.aggregate.totalTokensSaved
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Prompt health check failed:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

module.exports = router;

