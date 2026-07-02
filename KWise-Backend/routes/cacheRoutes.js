/**
 * Cache Management Routes for K-Wise AI System
 * Provides endpoints for cache statistics, monitoring, and administration
 * 
 * PHASE 2.2: Cache Optimization
 * - GET /api/cache/stats: Detailed cache statistics and hit rates
 * - GET /api/cache/details: Deep dive into cache layers
 * - POST /api/cache/invalidate: Invalidate specific cache entries
 * - POST /api/cache/clear: Clear all cache layers
 * - POST /api/cache/warm: Trigger manual cache warming
 * 
 * @module CacheRoutes
 * @version 2.2.0
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Use database connection with in-memory cache
const intelligentCache = require('../services/intelligentCache');
const { authenticateToken, restrictTo } = require('../middleware/auth'); // FIXED: Using restrictTo instead of requireRole
const logger = require('../utils/logger');

/**
 * GET /api/cache/stats
 * Get comprehensive cache statistics from in-memory cache
 * 
 * Returns:
 * - Hit rate percentage
 * - Total hits, misses
 * - Current size, max size
 * - Fill percentage
 * - Evictions count
 * - Sets count
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.get('/stats', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    // Try in-memory cache first, fallback to intelligent cache
    let stats;
    if (db.getCacheStats) {
      stats = db.getCacheStats();
    } else if (intelligentCache && intelligentCache.getStats) {
      stats = intelligentCache.getStats();
    } else {
      stats = {
        enabled: false,
        hits: 0,
        misses: 0,
        hitRate: '0.00%',
        sets: 0,
        evictions: 0,
        currentSize: 0,
        maxSize: 2000,
        fillPercentage: '0.00%'
      };
    }
    
    logger.info('📊 Cache statistics requested', {
      userId: req.user?.id || 'anonymous',
      hitRate: stats.hitRate
    });
    
    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get cache stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: error.message
    });
  }
});

/**
 * GET /api/cache/details
 * Get detailed cache information including sample entries
 * 
 * Returns:
 * - Full statistics
 * - Layer details with TTL configuration
 * - Sample entries from hot cache (first 10)
 * - Layer size vs limit information
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.get('/details', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    const details = intelligentCache.getDetails();
    
    logger.info('🔍 Cache details requested', {
      userId: req.user.id,
      totalEntries: details.stats.totalEntries
    });
    
    res.json({
      success: true,
      message: 'Cache details retrieved successfully',
      data: details,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to get cache details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache details',
      error: error.message
    });
  }
});

/**
 * POST /api/cache/invalidate
 * Invalidate cache entries by part ID or scenario
 * 
 * Body:
 * - partId (optional): Part ID to invalidate
 * - scenario (optional): Scenario type to invalidate
 * 
 * At least one parameter must be provided
 * 
 * Access: Requires authentication (admin role)
 */
router.post('/invalidate', authenticateToken, restrictTo('superadmin', 'admin'), (req, res) => {
  try {
    const { partId, scenario } = req.body;
    
    if (!partId && !scenario) {
      return res.status(400).json({
        success: false,
        message: 'Either partId or scenario must be provided'
      });
    }
    
    if (partId) {
      intelligentCache.invalidateByPart(partId);
      logger.info(`🔄 Cache invalidated for part ${partId}`, {
        userId: req.user.id
      });
    }
    
    if (scenario) {
      intelligentCache.invalidateByScenario(scenario);
      logger.info(`🔄 Cache invalidated for scenario ${scenario}`, {
        userId: req.user.id
      });
    }
    
    const stats = intelligentCache.getStats();
    
    res.json({
      success: true,
      message: 'Cache invalidation completed',
      data: {
        partId: partId || null,
        scenario: scenario || null,
        currentStats: stats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to invalidate cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error.message
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear all cache layers
 * 
 * Clears both in-memory cache and intelligent cache if available
 * 
 * WARNING: This will remove all cached data and may temporarily increase
 * AI processing load and response times.
 * 
 * Access: Requires authentication (superadmin only)
 */
router.post('/clear', authenticateToken, restrictTo('superadmin'), (req, res) => {
  try {
    let cleared = false;
    
    // Clear in-memory cache
    if (db.clearCache) {
      db.clearCache();
      cleared = true;
      logger.info('🗑️ In-memory cache cleared');
    }
    
    // Clear intelligent cache
    if (intelligentCache && intelligentCache.clear) {
      intelligentCache.clear();
      cleared = true;
      logger.info('🗑️ Intelligent cache cleared');
    }
    
    logger.warn('🗑️ CACHE CLEARED', {
      userId: req.user.id,
      username: req.user.username
    });
    
    const stats = db.getCacheStats ? db.getCacheStats() : intelligentCache.getStats();
    
    res.json({
      success: true,
      cleared,
      message: cleared ? 'All cache layers cleared successfully' : 'No cache available to clear',
      warning: cleared ? 'Cache is now empty - expect increased processing load temporarily' : null,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to clear cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cache',
      error: error.message
    });
  }
});

/**
 * POST /api/cache/warm
 * Trigger manual cache warming
 * 
 * Initiates cache warming process to pre-populate cache with popular
 * product combinations. This runs in the background and improves cache
 * hit rate from ~10% to 60%+.
 * 
 * Note: Cache warming is automatically scheduled every 6 hours, so manual
 * trigger is typically only needed after cache clear or server restart.
 * 
 * Access: Requires authentication (admin role)
 */
router.post('/warm', authenticateToken, restrictTo('superadmin', 'admin'), async (req, res) => {
  try {
    // Get cache warming service instance from global
    const cacheWarmingService = global.cacheWarming;
    
    if (!cacheWarmingService) {
      return res.status(503).json({
        success: false,
        message: 'Cache warming service not available'
      });
    }
    
    // Check if already warming
    if (cacheWarmingService.isWarming) {
      return res.status(409).json({
        success: false,
        message: 'Cache warming already in progress',
        hint: 'Please wait for the current warming process to complete'
      });
    }
    
    logger.info('🔥 Manual cache warming triggered', {
      userId: req.user.id
    });
    
    // Start warming in background (don't await)
    cacheWarmingService.warmCache().catch(error => {
      logger.error('❌ Manual cache warming failed:', error);
    });
    
    res.json({
      success: true,
      message: 'Cache warming started in background',
      hint: 'Check cache stats in a few minutes to see improvements',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Failed to trigger cache warming:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger cache warming',
      error: error.message
    });
  }
});

/**
 * GET /api/cache/health
 * Simple health check for cache system
 * 
 * Returns basic cache health indicators:
 * - Total entries
 * - Hit rate
 * - Memory usage
 * 
 * Access: Requires authentication (admin or developer role)
 */
router.get('/health', authenticateToken, restrictTo('superadmin', 'admin', 'developer'), (req, res) => {
  try {
    const stats = intelligentCache.getStats();
    const isHealthy = stats.totalEntries < 3000 && Number.parseFloat(stats.hitRate) > 0;
    
    res.json({
      success: true,
      healthy: isHealthy,
      data: {
        totalEntries: stats.totalEntries,
        hitRate: stats.hitRate,
        memoryUsageMB: stats.memoryUsageMB
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('❌ Cache health check failed:', error);
    res.status(500).json({
      success: false,
      healthy: false,
      error: error.message
    });
  }
});

module.exports = router;

